
import { GoogleGenAI } from "@google/genai";
import { Exam, Result, Student } from "../types";

export const aiService = {
  analyzeStudentPerformance: async (student: Student, exam: Exam, result: Result) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const itemsContext = exam.items?.map(item => {
      const marks = result.itemMarks?.[item.id] || 0;
      return `- ${item.label} (${item.description}): ${marks}/${item.maxMarks}`;
    }).join('\n');

    const prompt = `
      Anda adalah pakar pedagogi Bahasa Arab sekolah rendah di Malaysia. 
      Analisis prestasi murid berikut secara mendalam:
      
      Nama Murid: ${student.name}
      Ujian: ${exam.name}
      Keputusan: ${result.marks}/${exam.totalMarks}
      
      Pecahan Item:
      ${itemsContext || 'Tiada pecahan item.'}
      
      Sila berikan maklum balas dalam format berikut:
      1. **TAHAP PENGUASAAN**: Rumusan ringkas.
      2. **KEKUATAN**: Apa yang murid ini pandai/mahir berdasarkan markah item.
      3. **KELEMAHAN**: Apa yang murid ini lemah/kurang faham.
      4. **CADANGAN INTERVENSI**: Langkah spesifik untuk guru bantu murid ini.
      
      Gunakan bahasa Melayu yang profesional dan beri dorongan.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("AI Error:", error);
      return "Maaf, ralat berlaku semasa menjana analisis.";
    }
  },

  analyzeClassPerformance: async (className: string, exam: Exam, results: {studentName: string, result: Result}[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const performanceSummary = results.map(r => `${r.studentName}: ${r.result.marks}/${exam.totalMarks}`).join(', ');
    
    const prompt = `
      Analisis prestasi Kelas ${className} bagi ujian ${exam.name}.
      Data Murid: ${performanceSummary}
      Struktur Ujian: ${JSON.stringify(exam.items)}
      
      Berikan analisis kelas yang merangkumi:
      1. **PRESTASI KESELURUHAN**: Adakah kelas ini cemerlang atau perlu perhatian?
      2. **ITEM KRITIKAL**: Soalan mana yang paling ramai murid gagal atau lemah?
      3. **STRATEGI PENGAJARAN**: Cadangan aktiviti pengukuhan untuk seluruh kelas.
      4. **SENARAI MURID POTENSI**: Siapa yang perlukan bimbingan rapi.
      
      Gunakan format Markdown yang kemas.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      return "Gagal menjana analisis kelas.";
    }
  }
};
