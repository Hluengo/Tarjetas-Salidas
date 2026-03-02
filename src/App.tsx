import React, { useState, useMemo, useRef } from 'react';
import { Printer, Users, CheckSquare, Square, ChevronRight, School, Download, Info } from 'lucide-react';
// @ts-ignore - html2pdf doesn't have standard types
import html2pdf from 'html2pdf.js';

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
  const [selectedCourseId, setSelectedCourseId] = useState(MOCK_DATA[0].id);
  const [teacherName, setTeacherName] = useState(MOCK_DATA[0].defaultTeacher);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentCourse = useMemo(() => 
    MOCK_DATA.find(c => c.id === selectedCourseId) || MOCK_DATA[0]
  , [selectedCourseId]);

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
    MOCK_DATA.forEach(course => {
      course.students.forEach(student => {
        if (selectedStudentIds.has(student.id)) {
          allSelected.push(student);
        }
      });
    });
    return allSelected;
  }, [selectedStudentIds]);

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
          {/* Course Selector */}
          <section>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Curso
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={selectedCourseId}
              onChange={(e) => {
                const course = MOCK_DATA.find(c => c.id === e.target.value);
                setSelectedCourseId(e.target.value);
                if (course) setTeacherName(course.defaultTeacher);
              }}
            >
              {MOCK_DATA.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </section>

          {/* Teacher Input */}
          <section>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Profesor a Cargo
            </label>
            <input 
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Nombre del profesor..."
            />
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
