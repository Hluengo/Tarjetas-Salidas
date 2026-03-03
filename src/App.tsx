import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Printer, Users, CheckSquare, Square, ChevronRight, School, Download, Info, RefreshCw, Database } from 'lucide-react';
// @ts-ignore - html2pdf doesn't have standard types
import html2pdf from 'html2pdf.js';
import Papa from 'papaparse';

// --- Types ---
interface Student {
  id: string;
  name: string;
  course: string;
}

interface CourseData {
  id: string;
  name: string;
  defaultTeacher: string;
  students: Student[];
}

// --- Mock Data ---
const MOCK_DATA: CourseData[] = [
  {
    id: '3mb',
    name: '3° MEDIO B',
    defaultTeacher: 'ESTER CONTRERAS ESPINOZA',
    students: Array.from({ length: 30 }, (_, i) => ({
      id: `3mb-${i}`,
      name: [
        'MANUEL JARA GONZÁLEZ',
        'SOFÍA HENRÍQUEZ RIVAS',
        'CARLOS PÉREZ SOTO',
        'VALENTINA ROJAS DÍAZ',
        'DIEGO MUÑOZ LARA',
        'JAVIERA SILVA OPAZO',
        'NICOLÁS TAPIA VERA',
        'FERNANDA CASTRO RÍOS',
        'MATÍAS ARANEDA LÓPEZ',
        'CONSTANZA VALDÉS PAZ'
      ][i % 10],
      course: '3° MEDIO B'
    }))
  },
  {
    id: '4ma',
    name: '4° MEDIO A',
    defaultTeacher: 'RODRIGO FUENTES MORA',
    students: Array.from({ length: 25 }, (_, i) => ({
      id: `4ma-${i}`,
      name: [
        'ANDRÉS BELLO LÓPEZ',
        'MARÍA PAZ ORELLANA',
        'JUAN PABLO DUARTE',
        'CAMILA IGNACIA VERA',
        'SEBASTIÁN ANDRÉS PAZ'
      ][i % 5],
      course: '4° MEDIO A'
    }))
  },
  {
    id: '2mc',
    name: '2° MEDIO C',
    defaultTeacher: 'PATRICIA SANDOVAL RUIZ',
    students: Array.from({ length: 28 }, (_, i) => ({
      id: `2mc-${i}`,
      name: `ESTUDIANTE EJEMPLO`,
      course: '2° MEDIO C'
    }))
  }
];

// --- Components ---

const Card = ({ student, teacher }: { student: Student; teacher: string; key?: string | number }) => {
  return (
    <div 
      className="border-[0.5pt] border-black flex flex-col text-center bg-white relative"
      style={{ width: '85mm', height: '55mm', boxSizing: 'border-box' }}
    >
      {/* Top Half - Fixed height with minimal top padding to raise the name */}
      <div className="h-[27.5mm] flex flex-col justify-start items-center px-3 pt-2 overflow-visible" style={{ lineHeight: '1.1' }}>
        <div className="font-bold text-[16pt] uppercase w-full mb-4 mt-1">{student.name}</div>
        <div className="text-[16pt] uppercase w-full mb-2">{student.course}</div>
        <div className="text-[10pt] uppercase w-full font-medium opacity-90">
          PROF. A CARGO: {teacher}
        </div>
      </div>

      {/* Divider - Exactly at 27.5mm */}
      <div className="absolute top-[27.5mm] left-0 border-t-[0.5pt] border-black w-full"></div>

      {/* Bottom Half - Fixed height */}
      <div className="h-[27.5mm] flex flex-col justify-center items-center px-3 overflow-visible" style={{ lineHeight: '1.1' }}>
        <div className="font-bold italic text-[16pt] mb-1 w-full">COLEGIO MADRES DOMINICAS</div>
        <div className="text-[14pt] font-bold w-full">41 – 2224011</div>
        <div className="text-[14pt] font-bold uppercase w-full">FREIRE 114 CONCEPCIÓN</div>
      </div>
    </div>
  );
};

export default function App() {
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('gsheet_id') || '');
  const [dynamicData, setDynamicData] = useState<CourseData[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeData = dynamicData.length > 0 ? dynamicData : MOCK_DATA;

  const [selectedCourseId, setSelectedCourseId] = useState(activeData[0].id);
  const [teacherName, setTeacherName] = useState(activeData[0].defaultTeacher);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Update selection when data changes
  useEffect(() => {
    if (activeData.length > 0) {
      const firstCourse = activeData[0];
      setSelectedCourseId(firstCourse.id);
      setTeacherName(firstCourse.defaultTeacher);
    }
  }, [dynamicData]);

  const fetchSheetsData = async () => {
    let id = sheetId.trim();
    
    // Extract ID from URL if user pasted a full link
    if (id.includes('docs.google.com/spreadsheets/d/')) {
      const matches = id.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        id = matches[1];
        setSheetId(id);
      }
    }

    if (!id) {
      setError('Por favor ingresa un ID o URL de Google Sheet');
      return;
    }

    setIsLoading(true);
    setError(null);
    localStorage.setItem('gsheet_id', id);

    try {
      const fetchSheet = (name: string) => 
        new Promise<any[]>((resolve, reject) => {
          const isPublishedToken = id.startsWith('2PACX-');
          const url = isPublishedToken 
            ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&sheet=${encodeURIComponent(name)}`
            : `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
          
          Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                // Check if we actually got columns or just an error message from Google
                const firstRow = results.data[0];
                const columnCount = Object.keys(firstRow).length;
                if (columnCount <= 1 && !firstRow[Object.keys(firstRow)[0]]) {
                  reject(new Error(`La pestaña "${name}" no tiene datos o no existe.`));
                } else {
                  resolve(results.data);
                }
              } else {
                reject(new Error(`No se encontraron datos en la pestaña "${name}".`));
              }
            },
            error: (err) => reject(new Error(`Error de conexión al leer la pestaña "${name}".`))
          });
        });

      const [estudiantesRaw, docentesRaw] = await Promise.all([
        fetchSheet('estudiante'),
        fetchSheet('docente')
      ]);

      // Helper to find value by flexible key name
      const getValue = (row: any, possibleKeys: string[]) => {
        const keys = Object.keys(row);
        const foundKey = keys.find(k => {
          const normalizedK = k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return possibleKeys.some(pk => normalizedK.includes(pk.toLowerCase()));
        });
        return foundKey ? row[foundKey] : null;
      };

      // Process teachers as a simple list
      const teacherList: string[] = docentesRaw
        .map((d: any) => {
          const name = getValue(d, ['nombre', 'apellido', 'docente', 'profesor', 'maestro']);
          return (name || '').toString().trim();
        })
        .filter(name => name !== '');
      
      setTeachers(teacherList);

      // Process students and group by course
      const coursesMap = new Map<string, CourseData>();
      estudiantesRaw.forEach((s: any, index: number) => {
        const name = getValue(s, ['nombre', 'apellido', 'estudiante', 'alumno']);
        const courseName = getValue(s, ['curso', 'grado', 'nivel']);
        
        if (name && courseName) {
          const nameStr = name.toString().trim();
          const courseStr = courseName.toString().trim();
          const courseKey = courseStr.toUpperCase();
          
          if (!coursesMap.has(courseKey)) {
            coursesMap.set(courseKey, {
              id: courseKey,
              name: courseStr,
              defaultTeacher: teacherList[0] || 'SIN PROFESOR ASIGNADO',
              students: []
            });
          }
          coursesMap.get(courseKey)!.students.push({
            id: `gs-${index}`,
            name: nameStr,
            course: courseStr
          });
        }
      });

      const newData = Array.from(coursesMap.values());
      if (newData.length === 0) {
        throw new Error('No se encontraron datos válidos en las hojas. Revisa los nombres de las columnas.');
      }
      
      setDynamicData(newData);
      alert('¡Datos sincronizados con éxito!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al leer Google Sheets. Asegúrate de que el documento esté "Publicado en la Web".');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCourse = useMemo(() => 
    activeData.find(c => c.id === selectedCourseId) || activeData[0]
  , [selectedCourseId, activeData]);

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudentIds(newSet);
  };

  const selectAll = () => {
    const newSet = new Set(selectedStudentIds);
    currentCourse.students.forEach(s => newSet.add(s.id));
    setSelectedStudentIds(newSet);
  };

  const deselectAll = () => {
    const newSet = new Set(selectedStudentIds);
    currentCourse.students.forEach(s => newSet.delete(s.id));
    setSelectedStudentIds(newSet);
  };

  const selectedStudents = useMemo(() => {
    const allSelected: Student[] = [];
    activeData.forEach(course => {
      course.students.forEach(student => {
        if (selectedStudentIds.has(student.id)) {
          allSelected.push(student);
        }
      });
    });
    return allSelected;
  }, [selectedStudentIds, activeData]);

  // Group students into pages of 8 (4 rows x 2 columns)
  const pages = useMemo(() => {
    const chunks: Student[][] = [];
    for (let i = 0; i < selectedStudents.length; i += 8) {
      chunks.push(selectedStudents.slice(i, i + 8));
    }
    return chunks;
  }, [selectedStudents]);

  const handlePrint = () => {
    // window.print() is blocked by the sandbox environment (allow-modals not set)
    // So we use the PDF generation logic for both buttons as it's the most reliable way
    handleExportPDF();
  };

  const handleExportPDF = () => {
    const element = printRef.current;
    
    // If not in preview mode, we must activate it first to render the cards
    if (!isPreviewMode || !element) {
      setIsPreviewMode(true);
      // Give React time to render the preview-container
      setTimeout(() => {
        const newElement = printRef.current;
        if (newElement) {
          generatePDF(newElement);
        }
      }, 500);
      return;
    }
    
    generatePDF(element);
  };

  const generatePDF = (element: HTMLElement) => {
    const opt = {
      margin: 0,
      filename: `Tarjetas_Salida_${currentCourse.name.replace(/ /g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: false,
        logging: false,
        windowWidth: 1200 // Ensure it renders at a consistent width for the canvas
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: [216, 330] as [number, number], 
        orientation: 'portrait' as const 
      }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* Sidebar - Hidden on Print */}
      <aside className="no-print w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-full z-50 shadow-xl md:shadow-none relative">
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2 mb-1">
            <School className="w-6 h-6 text-emerald-400" />
            <h1 className="font-bold text-lg tracking-tight">Gestor de Tarjetas</h1>
          </div>
          <p className="text-xs text-slate-400">Colegio Madres Dominicas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Google Sheets Config */}
          <section className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Database className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Base de Datos (Sheets)</span>
            </div>
            <div className="space-y-2">
              <input 
                type="text"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="ID de la Planilla..."
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
              />
              <button 
                onClick={fetchSheetsData}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-1.5 rounded-lg font-semibold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Sincronizando...' : 'Sincronizar Datos'}
              </button>
            </div>
            {error && <p className="text-[10px] text-red-500 leading-tight">{error}</p>}
            <p className="text-[9px] text-slate-400 italic">
              * El documento debe estar "Publicado en la web".
            </p>
          </section>

          {/* Course Selector */}
          <section>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Curso
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={selectedCourseId}
              onChange={(e) => {
                const course = activeData.find(c => c.id === e.target.value);
                setSelectedCourseId(e.target.value);
                if (course) setTeacherName(course.defaultTeacher);
              }}
            >
              {activeData.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </section>

          {/* Teacher Selector */}
          <section>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Profesor a Cargo
            </label>
            {teachers.length > 0 ? (
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              >
                <option value="">Seleccionar profesor...</option>
                {teachers.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Nombre del profesor..."
              />
            )}
          </section>

          {/* Student List */}
          <section className="flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Estudiantes ({currentCourse.students.length})
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-emerald-600 hover:underline font-medium">Todos</button>
                <button onClick={deselectAll} className="text-[10px] text-slate-400 hover:underline font-medium">Ninguno</button>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {currentCourse.students.map(student => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm border-b border-slate-100 last:border-0 transition-colors ${
                    selectedStudentIds.has(student.id) ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-white'
                  }`}
                >
                  {selectedStudentIds.has(student.id) ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className="truncate">{student.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Instrucciones</span>
            </div>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Al hacer clic en <strong>Imprimir</strong>, se generará un archivo PDF optimizado para hoja Oficio (216x330mm). Ábrelo y envíalo a tu impresora.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <button 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              isPreviewMode 
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'
            }`}
          >
            {isPreviewMode ? 'Editar Selección' : 'Preparar Documento'}
            <ChevronRight className={`w-4 h-4 transition-transform ${isPreviewMode ? 'rotate-180' : ''}`} />
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={selectedStudentIds.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            Imprimir Documento (PDF)
          </button>
        </div>
      </aside>

      {/* Main Content / Preview Area */}
      <main className={`flex-1 h-full overflow-y-auto no-print ${isPreviewMode ? 'preview-container' : 'p-8 flex items-center justify-center'}`}>
        {!isPreviewMode ? (
          <div className="text-center max-w-md">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">Bienvenido al Generador</h2>
              <p className="text-slate-500 text-sm mb-6">
                Selecciona un curso y los estudiantes que necesitan tarjetas de salida. Luego haz clic en "Preparar Documento" para ver la previsualización antes de imprimir.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> Selecciona</span>
                <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Previsualiza</span>
                <span className="flex items-center gap-1"><Printer className="w-3 h-3" /> Imprime</span>
              </div>
            </div>
          </div>
        ) : (
          <div ref={printRef} className="flex flex-col items-center gap-8">
            {pages.length > 0 ? (
              pages.map((pageStudents, pageIdx) => (
                <div key={pageIdx} className="preview-page">
                  {pageStudents.map(student => (
                    <Card key={student.id} student={student} teacher={teacherName} />
                  ))}
                </div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                <p className="text-slate-500">No hay estudiantes seleccionados para imprimir.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Print-only container (redundant but ensures window.print() works even if main content is hidden) */}
      <div className="hidden print:block absolute top-0 left-0 w-full">
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="print-page">
            {pageStudents.map(student => (
              <Card key={student.id} student={student} teacher={teacherName} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
