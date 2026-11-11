/**
 * wordExport.ts
 * Generates Microsoft Word document (.doc / .docx) for PKL Task Report.
 * Embeds SMK TI BAZMA header into "Header -Section 1-" (aligned right)
 * and footer into "Footer -Section 1-" (aligned bottom) with exact dimensions,
 * so users do not need to manually edit headers/footers in Word.
 */

import { Task, ProfileSettings } from '@/types';
import { formatDateToIndonesian } from '@/lib/dateUtils';

interface ExportWordOptions {
  tasks: Task[];
  profile: ProfileSettings;
  bulanPelaksanaan: string;
  groupByDate?: boolean;
}

interface GroupedRow {
  tanggal: string;
  kegiatan: string[];
  tempat: string;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function downloadTaskReportWordDoc({
  tasks,
  profile,
  bulanPelaksanaan,
  groupByDate = true
}: ExportWordOptions): Promise<void> {
  // Sort tasks chronologically
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  );

  // Group tasks if requested
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

  // Fetch header and footer images as base64
  const [headerBase64, footerBase64] = await Promise.all([
    fetchImageAsBase64('/assets/kop-header.png'),
    fetchImageAsBase64('/assets/kop-footer.png')
  ]);

  // Build table rows HTML
  let tableRowsHtml = '';
  if (groupByDate) {
    if (groupedRows.length === 0) {
      tableRowsHtml = `<tr><td colspan="4" style="text-align:center;padding:16pt;color:#888;">Tidak ada kegiatan yang dipilih.</td></tr>`;
    } else {
      tableRowsHtml = groupedRows
        .map((row, idx) => {
          const itemsHtml = row.kegiatan
            .map((k) => `<li style="margin-bottom:2pt;line-height:1.35;">${escapeHtml(k)}</li>`)
            .join('');
          return `
          <tr style="mso-yfti-irow:${idx + 1};">
            <td style="text-align:center;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;">${idx + 1}</td>
            <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;white-space:nowrap;">${formatDateToIndonesian(row.tanggal)}</td>
            <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;">
              <ul style="margin:2pt 0;padding-left:14pt;">${itemsHtml}</ul>
            </td>
            <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;">${escapeHtml(row.tempat || 'Ruang IT / Server')}</td>
          </tr>`;
        })
        .join('');
    }
  } else {
    if (sortedTasks.length === 0) {
      tableRowsHtml = `<tr><td colspan="4" style="text-align:center;padding:16pt;color:#888;">Tidak ada tugas yang dipilih.</td></tr>`;
    } else {
      tableRowsHtml = sortedTasks
        .map((task, idx) => `
        <tr style="mso-yfti-irow:${idx + 1};">
          <td style="text-align:center;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;">${idx + 1}</td>
          <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;white-space:nowrap;">${formatDateToIndonesian(task.tanggal)}</td>
          <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;line-height:1.35;">${escapeHtml(task.tugas)}</td>
          <td style="text-align:left;border:1pt solid #000;padding:4pt 6pt;vertical-align:top;font-size:10pt;">${escapeHtml(task.tempat || 'Ruang IT / Server')}</td>
        </tr>`)
        .join('');
    }
  }

  const boundary = '----=_NextPart_Bazma_Doc_Boundary_01';

  // Construct Word Document with native Header & Footer Section definitions
  const htmlContent = `
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Laporan Hasil Praktik Kerja Lapangan</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
<!--
@page Section1 {
  size: 21.0cm 29.7cm; /* A4 */
  margin: 2.2cm 2.0cm 2.2cm 2.5cm; /* Top Right Bottom Left */
  mso-header-margin: 0.8cm;
  mso-footer-margin: 0.4cm;
  mso-header: h1;
  mso-footer: f1;
}
div.Section1 {
  page: Section1;
}
p.MsoHeader, div.MsoHeader {
  margin: 0cm;
  mso-pagination: widow-orphan;
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  font-size: 10pt;
}
p.MsoFooter, div.MsoFooter {
  margin: 0cm;
  mso-pagination: widow-orphan;
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  font-size: 10pt;
}
body {
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  font-size: 11pt;
  color: #000000;
  line-height: 1.25;
}
h1 {
  font-family: Calibri, sans-serif;
  font-size: 13pt;
  font-weight: bold;
  text-align: center;
  margin: 0;
  text-transform: uppercase;
}
h2 {
  font-family: Calibri, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: center;
  margin: 2pt 0;
  text-transform: uppercase;
}
h3 {
  font-family: Calibri, sans-serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: center;
  margin: 0 0 12pt 0;
  text-transform: uppercase;
}
table.meta-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10pt;
  margin-bottom: 12pt;
  font-size: 11pt;
}
table.meta-table td {
  padding: 1.5pt 0;
  vertical-align: top;
}
table.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8pt;
  margin-bottom: 20pt;
}
table.report-table th {
  border: 1pt solid #000000;
  padding: 5pt 4pt;
  font-size: 10pt;
  font-weight: bold;
  text-align: center;
  background-color: #f2f4f7;
}
table.report-table td {
  border: 1pt solid #000000;
  padding: 4pt 6pt;
  font-size: 10pt;
}
table.signature-table {
  width: 100%;
  border-collapse: collapse;
  border: none;
  margin-top: 18pt;
  page-break-inside: avoid;
}
table.signature-table td {
  border: none;
  text-align: center;
  vertical-align: top;
  font-size: 10.5pt;
  padding: 0 4pt;
}
-->
</style>
</head>
<body lang="ID">
<div class="Section1">

  <!-- ==================== HEADER (Section 1) ==================== -->
  <div style="mso-element:header" id="h1">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0;padding:0;border:none;">
      <tr>
        <td align="right" style="padding:0;border:none;text-align:right;">
          <img src="kop-header.png" width="220" style="width:220px;height:auto;" alt="SMK TI BAZMA" />
        </td>
      </tr>
    </table>
  </div>

  <!-- ==================== FOOTER (Section 1) ==================== -->
  <div style="mso-element:footer" id="f1">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0;padding:0;border:none;">
      <tr>
        <td align="center" style="padding:0;border:none;text-align:center;">
          <img src="kop-footer.png" width="680" style="width:100%;max-width:680px;height:auto;" alt="Footer SMK TI BAZMA" />
        </td>
      </tr>
    </table>
  </div>

  <!-- Document Title -->
  <div style="text-align:center;margin-bottom:14pt;">
    <h1>LAPORAN HASIL PRAKTIK KERJA LAPANGAN</h1>
    <h2>SISWA PKL ${escapeHtml(profile.sekolah || 'SMK TI BAZMA')}</h2>
    <h3>${escapeHtml(profile.tempatPkl || 'YAYASAN KESEHATAN PERTAMINA')}</h3>
  </div>

  <!-- Metadata Table -->
  <table class="meta-table">
    <tr>
      <td width="240">Nama / NIS</td>
      <td width="16">:</td>
      <td><b>${escapeHtml(profile.namaSiswa)} / ${escapeHtml(profile.nis)}</b></td>
    </tr>
    <tr>
      <td>Tempat Praktik Kerja Lapangan</td>
      <td>:</td>
      <td><b>${escapeHtml(profile.tempatPkl)}</b></td>
    </tr>
    <tr>
      <td>Bulan Pelaksanaan</td>
      <td>:</td>
      <td><b>${escapeHtml(bulanPelaksanaan || profile.bulanPelaksanaan)}</b></td>
    </tr>
  </table>

  <!-- Tasks Table -->
  <table class="report-table">
    <thead>
      <tr style="mso-yfti-irow:0;mso-yfti-header:yes;">
        <th width="38">No</th>
        <th width="125">Tanggal</th>
        <th>Kegiatan yang dilakukan</th>
        <th width="135">Tempat</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <!-- Signature Section (Image 1 Format) -->
  <div style="page-break-inside:avoid;margin-top:20pt;">
    <p style="text-align:center;margin-bottom:14pt;font-size:11pt;">Mengetahui,</p>
    
    <table class="signature-table" width="100%">
      <tr>
        <td width="33%" style="text-align:center;vertical-align:top;padding:0 6pt;">
          <p style="margin:0;font-weight:bold;">Pembimbing DU/DI</p>
          <div style="height:65pt;line-height:65pt;">&nbsp;</div>
          <p style="margin:0;white-space:nowrap;overflow:visible;">${escapeHtml(profile.userDuDi || 'Achmad Fauzy')}</p>
        </td>
        <td width="34%" style="text-align:center;vertical-align:top;padding:0 6pt;">
          <p style="margin:0;font-weight:bold;">Pembimbing PKL</p>
          <div style="height:65pt;line-height:65pt;">&nbsp;</div>
          <p style="margin:0;white-space:nowrap;overflow:visible;">${escapeHtml(profile.pembimbingPkl || 'Muhamad Dzikri Fauzan, S.Kom, Gr.')}</p>
        </td>
        <td width="33%" style="text-align:center;vertical-align:top;padding:0 6pt;">
          <p style="margin:0;font-weight:bold;">Peserta PKL</p>
          <div style="height:65pt;line-height:65pt;">&nbsp;</div>
          <p style="margin:0;white-space:nowrap;overflow:visible;">${escapeHtml(profile.pesertaPkl || profile.namaSiswa || 'Fakhri Zainul Arifin')}</p>
        </td>
      </tr>
    </table>
  </div>

</div>
</body>
</html>
`;

  // MHTML Multipart packaging with embedded base64 images
  let mhtml = `MIME-Version: 1.0\n`;
  mhtml += `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"\n\n`;

  // Part 1: Main HTML
  mhtml += `--${boundary}\n`;
  mhtml += `Content-Type: text/html; charset="utf-8"\n`;
  mhtml += `Content-Transfer-Encoding: 8bit\n\n`;
  mhtml += htmlContent.trim() + `\n\n`;

  // Part 2: Header Image
  if (headerBase64) {
    mhtml += `--${boundary}\n`;
    mhtml += `Content-Type: image/png\n`;
    mhtml += `Content-Transfer-Encoding: base64\n`;
    mhtml += `Content-Location: kop-header.png\n\n`;
    mhtml += headerBase64 + `\n\n`;
  }

  // Part 3: Footer Image
  if (footerBase64) {
    mhtml += `--${boundary}\n`;
    mhtml += `Content-Type: image/png\n`;
    mhtml += `Content-Transfer-Encoding: base64\n`;
    mhtml += `Content-Location: kop-footer.png\n\n`;
    mhtml += footerBase64 + `\n\n`;
  }

  mhtml += `--${boundary}--\n`;

  // Create Blob & Trigger Download as Word Document (.doc)
  const blob = new Blob(['\ufeff', mhtml], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameDate = (bulanPelaksanaan || profile.bulanPelaksanaan || 'Oktober_2026').replace(/\s+/g, '_');
  const studentShort = (profile.namaSiswa || 'Siswa').split(' ')[0];
  a.download = `Laporan_Hasil_PKL_${fileNameDate}_${studentShort}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

