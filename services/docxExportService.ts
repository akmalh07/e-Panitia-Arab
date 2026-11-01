import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, Packer, Header, Footer, PageNumber, NumberFormat } from 'docx';
import { saveAs } from 'file-saver';
import { AnnualReport } from '../types';

/**
 * Service to generate Microsoft Word (.docx) files for Annual Reports
 */
export async function exportAnnualReportToDocx(report: AnnualReport, sectionKey?: string): Promise<void> {
  const primaryColor = '1E3A8A'; // Navy Blue
  const darkTextColor = '1F2937';
  
  // Title / Header paragraphs
  const titleParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: report.schoolName.toUpperCase(), bold: true, size: 28, color: primaryColor }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `LAPORAN DAN PENILAIAN TAHUNAN - PANITIA ${report.panitiaName.toUpperCase()}`, bold: true, size: 24, color: primaryColor }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `TAHUN SESI ${report.year}`, bold: true, size: 22, color: '4B5563' }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];

  const sectionsList: Paragraph[] = [];

  // Helper for Section Headings
  const addSectionHeading = (title: string) => {
    sectionsList.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [
          new TextRun({ text: title, bold: true, size: 22, color: primaryColor }),
        ],
      })
    );
  };

  // Helper for Bullets
  const addBullet = (text: string) => {
    sectionsList.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text, size: 20, color: darkTextColor })],
      })
    );
  };

  // Helper for Table Cell
  const createTableCell = (text: string, isHeader = false, widthPercent = 20) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: isHeader ? { fill: 'E5E7EB' } : undefined,
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: isHeader, size: 18, color: darkTextColor })],
          spacing: { before: 60, after: 60 },
        }),
      ],
    });
  };

  // 1. Laporan Aktiviti Panitia
  if (!sectionKey || sectionKey === 'activities') {
    addSectionHeading('1. LAPORAN AKTIVITI PANITIA');
    if (report.activities.length === 0) {
      sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Tiada aktiviti direkodkan.', italics: true, size: 20 })] }));
    } else {
      const rows = [
        new TableRow({
          children: [
            createTableCell('Bil', true, 8),
            createTableCell('Nama Aktiviti / Program', true, 42),
            createTableCell('Tarikh / Tempoh', true, 20),
            createTableCell('Kategori', true, 15),
            createTableCell('Status', true, 15),
          ],
        }),
        ...report.activities.map((act, index) =>
          new TableRow({
            children: [
              createTableCell(String(index + 1), false, 8),
              createTableCell(act.title, false, 42),
              createTableCell(act.date, false, 20),
              createTableCell(act.category, false, 15),
              createTableCell(act.status, false, 15),
            ],
          })
        ),
      ];
      sectionsList.push(new Paragraph({ children: [] }));
      sectionsList.push(
        new Paragraph({
          children: [],
        })
      );
      sectionsList.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }) as any
      );
    }
  }

  // 2. Laporan Program Akademik
  if (!sectionKey || sectionKey === 'academicPrograms') {
    addSectionHeading('2. LAPORAN PROGRAM AKADEMIK & INTERVENSI');
    if (report.academicPrograms.length === 0) {
      sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Tiada program akademik direkodkan.', italics: true, size: 20 })] }));
    } else {
      const rows = [
        new TableRow({
          children: [
            createTableCell('Bil', true, 8),
            createTableCell('Nama Program', true, 35),
            createTableCell('Kumpulan Sasaran', true, 22),
            createTableCell('Tarikh', true, 15),
            createTableCell('Pencapaian (%)', true, 20),
          ],
        }),
        ...report.academicPrograms.map((prog, index) =>
          new TableRow({
            children: [
              createTableCell(String(index + 1), false, 8),
              createTableCell(prog.name, false, 35),
              createTableCell(prog.targetGroup, false, 22),
              createTableCell(prog.implementationDate, false, 15),
              createTableCell(`${prog.achievementPercentage}% (${prog.outcome})`, false, 20),
            ],
          })
        ),
      ];
      sectionsList.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }) as any
      );
    }
  }

  // 3. Rumusan Pencapaian Murid
  if (!sectionKey || sectionKey === 'studentAchievementSummary') {
    addSectionHeading('3. RUMUSAN PENCAPAIAN MURID');
    const summary = report.studentAchievementSummary;
    sectionsList.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Jumlah Murid Dinilai: `, bold: true, size: 20 }),
          new TextRun({ text: `${summary.totalStudents} orang | `, size: 20 }),
          new TextRun({ text: `Peratus Kelulusan Keseluruhan: `, bold: true, size: 20 }),
          new TextRun({ text: `${summary.overallPassRate}% | `, size: 20 }),
          new TextRun({ text: `Purata Markah Panitia: `, bold: true, size: 20 }),
          new TextRun({ text: `${summary.averageMarks}%`, size: 20 }),
        ],
        spacing: { after: 120 },
      })
    );

    // Grade distribution table
    if (summary.gradeDistribution && Object.keys(summary.gradeDistribution).length > 0) {
      const gradeKeys = Object.keys(summary.gradeDistribution);
      const rows = [
        new TableRow({
          children: [
            createTableCell('Gred / Tahap Penguasaan', true, 50),
            createTableCell('Bilangan Murid', true, 50),
          ],
        }),
        ...gradeKeys.map((g) =>
          new TableRow({
            children: [
              createTableCell(`Gred ${g}`, false, 50),
              createTableCell(`${summary.gradeDistribution[g]} orang`, false, 50),
            ],
          })
        ),
      ];
      sectionsList.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }) as any
      );
    }

    if (summary.summaryNotes) {
      sectionsList.push(
        new Paragraph({
          spacing: { before: 100, after: 150 },
          children: [
            new TextRun({ text: 'Ulasan Pencapaian: ', bold: true, size: 20 }),
            new TextRun({ text: summary.summaryNotes, size: 20 }),
          ],
        })
      );
    }
  }

  // 4. Penilaian Pencapaian Objektif Panitia
  if (!sectionKey || sectionKey === 'objectives') {
    addSectionHeading('4. PENILAIAN PENCAPAIAN OBJEKTIF PANITIA');
    if (report.objectives.length === 0) {
      sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Tiada objektif panitia direkodkan.', italics: true, size: 20 })] }));
    } else {
      const rows = [
        new TableRow({
          children: [
            createTableCell('Bil', true, 8),
            createTableCell('Objektif Panitia', true, 37),
            createTableCell('Sasaran KPI', true, 20),
            createTableCell('Pencapaian Sebenar', true, 20),
            createTableCell('Status KPI', true, 15),
          ],
        }),
        ...report.objectives.map((obj, index) =>
          new TableRow({
            children: [
              createTableCell(String(index + 1), false, 8),
              createTableCell(obj.objective, false, 37),
              createTableCell(obj.targetKPI, false, 20),
              createTableCell(obj.actualAchievement, false, 20),
              createTableCell(obj.status.replace(/_/g, ' '), false, 15),
            ],
          })
        ),
      ];
      sectionsList.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        }) as any
      );
    }
  }

  // 5. Rumusan Kekuatan dan Kelemahan
  if (!sectionKey || sectionKey === 'swotAnalysis') {
    addSectionHeading('5. RUMUSAN KEKUATAN, KELEMAHAN, PELUANG & ANCAMAN (SWOT)');
    
    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Kekuatan (Strengths):', bold: true, size: 20, color: '16A34A' })], spacing: { before: 80 } }));
    (report.swotAnalysis.strengths || []).forEach(addBullet);

    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Kelemahan (Weaknesses):', bold: true, size: 20, color: 'DC2626' })], spacing: { before: 80 } }));
    (report.swotAnalysis.weaknesses || []).forEach(addBullet);

    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Peluang (Opportunities):', bold: true, size: 20, color: '2563EB' })], spacing: { before: 80 } }));
    (report.swotAnalysis.opportunities || []).forEach(addBullet);

    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Ancaman / Kekangan (Threats):', bold: true, size: 20, color: 'D97706' })], spacing: { before: 80 } }));
    (report.swotAnalysis.threats || []).forEach(addBullet);
  }

  // 6. Cadangan Penambahbaikan
  if (!sectionKey || sectionKey === 'recommendations') {
    addSectionHeading('6. CADANGAN PENAMBAHBAIKAN');
    if (report.recommendations.length === 0) {
      sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Tiada cadangan direkodkan.', italics: true, size: 20 })] }));
    } else {
      report.recommendations.forEach(addBullet);
    }
  }

  // 7. Perancangan Awal Bagi Tahun Berikutnya
  if (!sectionKey || sectionKey === 'nextYearPlan') {
    addSectionHeading(`7. PERANCANGAN AWAL BAGI TAHUN ${report.year + 1}`);
    const nyp = report.nextYearPlan;

    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Sasaran & Matlamat Utama:', bold: true, size: 20 })], spacing: { before: 80 } }));
    (nyp.goals || []).forEach(addBullet);

    sectionsList.push(new Paragraph({ children: [new TextRun({ text: 'Cadangan Program Peningkatan:', bold: true, size: 20 })], spacing: { before: 80 } }));
    (nyp.upcomingPrograms || []).forEach(addBullet);

    if (nyp.budgetEstimate) {
      sectionsList.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: 'Anggaran Peruntukan Kewangan: ', bold: true, size: 20 }),
            new TextRun({ text: nyp.budgetEstimate, size: 20 }),
          ],
        })
      );
    }

    if (nyp.notes) {
      sectionsList.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [
            new TextRun({ text: 'Nota Tambahan: ', bold: true, size: 20 }),
            new TextRun({ text: nyp.notes, size: 20 }),
          ],
        })
      );
    }
  }

  // Signatures Section
  const signatureParagraphs = [
    new Paragraph({ text: '', spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Disediakan oleh:', size: 20 })] }),
                new Paragraph({ text: '', spacing: { before: 500 } }),
                new Paragraph({ children: [new TextRun({ text: `(${report.preparedBy || 'Ketua Panitia'})`, bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: `Ketua Panitia ${report.panitiaName}`, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `Tarikh: ${report.datePrepared || new Date().toLocaleDateString('ms-MY')}`, size: 18 })] }),
              ],
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Disahkan oleh:', size: 20 })] }),
                new Paragraph({ text: '', spacing: { before: 500 } }),
                new Paragraph({ children: [new TextRun({ text: `(${report.approvedBy || report.headTeacherName || 'Guru Besar / Penolong Kanan'})`, bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Guru Besar / GPK Pentadbiran', size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Tarikh: .......................................', size: 18 })] }),
              ],
            }),
          ],
        }),
      ],
    }) as any,
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Laporan Tahunan Panitia ${report.panitiaName} - ${report.year}`, size: 16, color: '9CA3AF' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Muka Surat ', size: 16, color: '9CA3AF' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '9CA3AF',
                  }),
                  new TextRun({ text: ' daripada ', size: 16, color: '9CA3AF' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '9CA3AF',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...titleParagraphs, ...sectionsList, ...signatureParagraphs],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const sectionSuffix = sectionKey ? `_${sectionKey}` : '_Laporan_Lengkap';
  const fileName = `Laporan_Tahunan_Panitia_${report.panitiaName.replace(/\s+/g, '_')}_${report.year}${sectionSuffix}.docx`;
  saveAs(blob, fileName);
}
