import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign
} from 'docx';
import { Task, ProfileSettings } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tasks = [],
      profile = {} as ProfileSettings,
      bulanPelaksanaan = 'Oktober 2026',
      groupByDate = true
    } = body;

    // Load header and footer png from public/assets
    const publicDir = path.join(process.cwd(), 'public', 'assets');
    const headerPath = path.join(publicDir, 'kop-header.png');
    const footerPath = path.join(publicDir, 'kop-footer.png');

    const headerBuf = fs.existsSync(headerPath) ? fs.readFileSync(headerPath) : null;
    const footerBuf = fs.existsSync(footerPath) ? fs.readFileSync(footerPath) : null;

    const sortedTasks: Task[] = [...tasks].sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    interface GroupedRow {
      tanggal: string;
      kegiatan: string[];
      tempat: string;
    }

    const groupedRows: GroupedRow[] = [];
    if (groupByDate) {
      const map = new Map<string, GroupedRow>();
      sortedTasks.forEach((task) => {
        const existing = map.get(task.tanggal);
        if (existing) {
          existing.kegiatan.push(task.tugas);
          if (!existing.tempat && task.tempat) existing.tempat = task.tempat;
        } else {
          map.set(task.tanggal, {
            tanggal: task.tanggal,
            kegiatan: [task.tugas],
            tempat: task.tempat || profile.defaultTempat || 'Ruang IT / Server'
          });
        }
      });
      map.forEach((val) => groupedRows.push(val));
    }

    // Header Children (SMK TI BAZMA Logo on Right Side - Image 3)
    const headerChildren: Paragraph[] = [];
    if (headerBuf) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 0, line: 240 },
          children: [
            new ImageRun({
              data: headerBuf,
              transformation: { width: 220, height: 33.8 }, // maintains 1429 x 220 ratio
              type: 'png'
            })
          ]
        })
      );
    }

    // Footer Children (SMK TI BAZMA Footer Banner & Address - Image 2)
    const footerChildren: Paragraph[] = [];
    if (footerBuf) {
      footerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0, line: 240 },
          children: [
            new ImageRun({
              data: footerBuf,
              transformation: { width: 620, height: 78.1 }, // maintains 1429 x 180 ratio
              type: 'png'
            })
          ]
        })
      );
    }

    // Table Header Row
    const tableHeaderRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'F2F4F7' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: 'No', bold: true, size: 20, font: 'Calibri' })]
            })
          ]
        }),
        new TableCell({
          width: { size: 2100, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'F2F4F7' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: 'Tanggal', bold: true, size: 20, font: 'Calibri' })]
            })
          ]
        }),
        new TableCell({
          width: { size: 5200, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'F2F4F7' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: 'Kegiatan yang dilakukan', bold: true, size: 20, font: 'Calibri' })]
            })
          ]
        }),
        new TableCell({
          width: { size: 2100, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'F2F4F7' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: 'Tempat', bold: true, size: 20, font: 'Calibri' })]
            })
          ]
        })
      ]
    });

    // Table Data Rows
    const dataRows: TableRow[] = [];
    if (groupByDate) {
      if (groupedRows.length === 0) {
        dataRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 4,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 },
                    children: [new TextRun({ text: 'Tidak ada data kegiatan.', color: '888888', font: 'Calibri' })]
                  })
                ]
              })
            ]
          })
        );
      } else {
        groupedRows.forEach((row, idx) => {
          const activityParagraphs = row.kegiatan.map(
            (k) =>
              new Paragraph({
                spacing: { before: 40, after: 40, line: 240 },
                children: [new TextRun({ text: `• ${k}`, size: 20, font: 'Calibri' })]
              })
          );

          dataRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: String(idx + 1), size: 20, font: 'Calibri' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 2100, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: formatDateToIndonesian(row.tanggal), size: 20, font: 'Calibri' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 5200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: activityParagraphs
                }),
                new TableCell({
                  width: { size: 2100, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: row.tempat || 'Ruang IT / Server', size: 20, font: 'Calibri' })]
                    })
                  ]
                })
              ]
            })
          );
        });
      }
    } else {
      if (sortedTasks.length === 0) {
        dataRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 4,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 },
                    children: [new TextRun({ text: 'Tidak ada data kegiatan.', color: '888888', font: 'Calibri' })]
                  })
                ]
              })
            ]
          })
        );
      } else {
        sortedTasks.forEach((task, idx) => {
          dataRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 600, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: String(idx + 1), size: 20, font: 'Calibri' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 2100, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: formatDateToIndonesian(task.tanggal), size: 20, font: 'Calibri' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 5200, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60, line: 240 },
                      children: [new TextRun({ text: task.tugas, size: 20, font: 'Calibri' })]
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 2100, type: WidthType.DXA },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60 },
                      children: [new TextRun({ text: task.tempat || 'Ruang IT / Server', size: 20, font: 'Calibri' })]
                    })
                  ]
                })
              ]
            })
          );
        });
      }
    }

    const tasksTable = new Table({
      width: { size: 10000, type: WidthType.DXA },
      rows: [tableHeaderRow, ...dataRows]
    });

    // Metadata Table (Nama / NIS, Tempat PKL, Bulan Pelaksanaan)
    const metaTable = new Table({
      width: { size: 10000, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: 'Nama / NIS', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 300, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 6700, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: `${profile.namaSiswa || 'Fakhri Zainul Arifin'} / ${profile.nis || '2324009'}`, bold: true, size: 22, font: 'Calibri' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: 'Tempat Praktik Kerja Lapangan', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 300, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 6700, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: profile.tempatPkl || 'Yayasan Kesehatan Pertamina', bold: true, size: 22, font: 'Calibri' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: 'Bulan Pelaksanaan', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 300, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: ':', size: 22, font: 'Calibri' })] })]
            }),
            new TableCell({
              width: { size: 6700, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: bulanPelaksanaan || profile.bulanPelaksanaan || 'Oktober 2026', bold: true, size: 22, font: 'Calibri' })] })]
            })
          ]
        })
      ]
    });

    // Signature Block Table (Image 1 Layout - 3 columns, no wrap, no underline)
    const signatureTable = new Table({
      width: { size: 10000, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        // Role Row
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'Pembimbing DU/DI', bold: true, size: 21, font: 'Calibri' })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3334, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'Pembimbing PKL', bold: true, size: 21, font: 'Calibri' })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'Peserta PKL', bold: true, size: 21, font: 'Calibri' })]
                })
              ]
            })
          ]
        }),
        // Signature Space Row (~80pt gap)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 1300, after: 0 }, children: [] })]
            }),
            new TableCell({
              width: { size: 3334, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 1300, after: 0 }, children: [] })]
            }),
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [new Paragraph({ spacing: { before: 1300, after: 0 }, children: [] })]
            })
          ]
        }),
        // Name Row (Image 1: Achmad Fauzy | Muhamad Dzikri Fauzan, S.Kom, Gr. | Fakhri Zainul Arifin)
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: profile.userDuDi || 'Achmad Fauzy', size: 21, font: 'Calibri' })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3334, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: profile.pembimbingPkl || 'Muhamad Dzikri Fauzan, S.Kom, Gr.', size: 21, font: 'Calibri' })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3333, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: profile.pesertaPkl || profile.namaSiswa || 'Fakhri Zainul Arifin', size: 21, font: 'Calibri' })]
                })
              ]
            })
          ]
        })
      ]
    });

    // Create the full Document with Header & Footer Sections
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4
              margin: {
                top: 1134,    // 2.0 cm
                right: 1134,  // 2.0 cm
                bottom: 1134, // 2.0 cm
                left: 1417,   // 2.5 cm
                header: 567,  // 1.0 cm
                footer: 283   // 0.5 cm
              }
            }
          },
          headers: {
            default: new Header({ children: headerChildren })
          },
          footers: {
            default: new Footer({ children: footerChildren })
          },
          children: [
            // Title Paragraphs
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: 'LAPORAN HASIL PRAKTIK KERJA LAPANGAN',
                  bold: true,
                  size: 26,
                  font: 'Calibri'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: `SISWA PKL ${profile.sekolah || 'SMK TI BAZMA'}`,
                  bold: true,
                  size: 24,
                  font: 'Calibri'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: profile.tempatPkl || 'YAYASAN KESEHATAN PERTAMINA',
                  bold: true,
                  size: 24,
                  font: 'Calibri'
                })
              ]
            }),

            // Metadata Table
            metaTable,

            // Spacing
            new Paragraph({ spacing: { after: 140 }, children: [] }),

            // Tasks Table
            tasksTable,

            // Spacing
            new Paragraph({ spacing: { after: 200 }, children: [] }),

            // "Mengetahui,"
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 140 },
              children: [new TextRun({ text: 'Mengetahui,', size: 22, font: 'Calibri' })]
            }),

            // Signature Block
            signatureTable
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    const safeMonth = (bulanPelaksanaan || 'Oktober_2026').replace(/\s+/g, '_');
    const safeName = (profile.namaSiswa || 'Siswa').split(' ')[0];
    const filename = `Laporan_Hasil_PKL_${safeMonth}_${safeName}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('Error creating docx:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
