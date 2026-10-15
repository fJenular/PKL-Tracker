import { getSettings, getAttendance, saveAttendance } from '@/lib/storage';
import { AttendanceRecord } from '@/types';

const BASE_URL = 'https://smartpkl.smktibazma.sch.id';

const INDONESIAN_MONTHS_MAP: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

function parseCookies(headers: Headers): Record<string, string> {
  const cookies: Record<string, string> = {};
  const rawCookies: string[] =
    typeof (headers as any).getSetCookie === 'function'
      ? (headers as any).getSetCookie()
      : (headers.get('set-cookie') || '').split(/,(?=[^;]+=[^;]+;)/);

  for (const cookieStr of rawCookies) {
    const nameValuePair = cookieStr.trim().split(';')[0];
    const eqIdx = nameValuePair.indexOf('=');
    if (eqIdx > 0) {
      const name = nameValuePair.substring(0, eqIdx).trim();
      const value = nameValuePair.substring(eqIdx + 1).trim();
      cookies[name] = value;
    }
  }
  return cookies;
}

function buildCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export function parseSmartPKLDate(dateStr: string): string {
  // e.g. "15 Oktober 2026" -> "2026-10-15"
  const clean = dateStr.trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = INDONESIAN_MONTHS_MAP[parts[1].toLowerCase()] || '10';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

export function parseSmartPKLTable(html: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: { text: string; html: string }[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      cells.push({ text, html: cellMatch[1].trim() });
    }

    // Expected cols: 0: No, 1: Hari, 2: Tanggal, 3: Waktu, 4: Kehadiran, 5: Keterangan, 6: Foto, 7: Lokasi
    if (cells.length >= 5) {
      const rawTanggal = cells[2].text;
      const tanggal = parseSmartPKLDate(rawTanggal);
      const rawWaktu = cells[3].text; // e.g. "07:44:12"
      const jamMasuk = rawWaktu.length >= 5 ? rawWaktu.substring(0, 5) : rawWaktu;
      const statusRaw = cells[4].text.trim();
      let status: 'Hadir' | 'Izin' | 'Sakit' | 'Libur' = 'Hadir';
      if (statusRaw.toLowerCase().includes('izin')) status = 'Izin';
      else if (statusRaw.toLowerCase().includes('sakit')) status = 'Sakit';
      else if (statusRaw.toLowerCase().includes('libur')) status = 'Libur';

      const rawKet = cells[5] ? cells[5].text.trim() : '';
      const keterangan = rawKet === '-' || !rawKet ? 'Hadir di tempat PKL' : rawKet;

      let fotoUrl = '';
      if (cells[6]) {
        const imgMatch = cells[6].html.match(/src=["']([^"']+)["']/i);
        if (imgMatch) {
          fotoUrl = imgMatch[1].startsWith('http')
            ? imgMatch[1]
            : `${BASE_URL}/${imgMatch[1]}`;
        }
      }

      records.push({
        tanggal,
        status,
        jamMasuk,
        jamPulang: '',
        keterangan,
        fotoUrl,
        createdAt: `${tanggal}T${rawWaktu}Z`,
      });
    }
  }

  return records;
}

/**
 * Fetch and synchronize all real attendance records from SmartPKL.
 * Preserves local 'jamPulang' recorded in Task Tracker.
 * Completely replaces old mock/dummy data with real SmartPKL records.
 */
export async function syncSmartPKLAttendance(): Promise<{
  success: boolean;
  message: string;
  data: AttendanceRecord[];
}> {
  try {
    const settings = getSettings();
    const sp = (settings as any).smartpkl || {};
    const username = (sp.username || '').trim();
    const password = (sp.password || '').trim();

    if (!username || !password) {
      return {
        success: false,
        message: 'Kredensial SmartPKL belum diatur di Settings.',
        data: getAttendance(),
      };
    }

    // 1. Login to SmartPKL
    const loginForm = new URLSearchParams({
      username,
      password,
      ingat_saya: '1',
    });

    const loginRes = await fetch(`${BASE_URL}/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${BASE_URL}/login.php`,
        'Origin': BASE_URL,
      },
      body: loginForm,
      redirect: 'manual',
    });

    const allCookies = parseCookies(loginRes.headers);

    if (loginRes.status === 302 || loginRes.status === 301) {
      const redirectUrl = loginRes.headers.get('location');
      if (redirectUrl) {
        const fullUrl = redirectUrl.startsWith('http') ? redirectUrl : `${BASE_URL}/${redirectUrl}`;
        const redirRes = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': buildCookieString(allCookies),
          },
          redirect: 'manual',
        });
        Object.assign(allCookies, parseCookies(redirRes.headers));
      }
    }

    const cookieStr = buildCookieString(allCookies);

    // 2. Fetch Riwayat Presensi
    const riwayatRes = await fetch(`${BASE_URL}/index.php?page=riwayat`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieStr,
      },
    });

    if (!riwayatRes.ok) {
      return {
        success: false,
        message: `Gagal memuat halaman riwayat SmartPKL (Status: ${riwayatRes.status})`,
        data: getAttendance(),
      };
    }

    const html = await riwayatRes.text();
    const smartPklRecords = parseSmartPKLTable(html);

    if (smartPklRecords.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data presensi yang ditemukan di SmartPKL.',
        data: getAttendance(),
      };
    }

    // 3. Merge with local records:
    // Keep any 'jamPulang' recorded in Task Tracker (since absen pulang is only tracked in Task Tracker)
    const existingLocal = getAttendance();
    const localMap = new Map<string, AttendanceRecord>();
    for (const r of existingLocal) {
      localMap.set(r.tanggal, r);
    }

    const mergedRecords: AttendanceRecord[] = smartPklRecords.map((spRec) => {
      const local = localMap.get(spRec.tanggal);
      return {
        ...spRec,
        // Preserve local jamPulang if recorded
        jamPulang: local?.jamPulang || '',
      };
    });

    // Sort descending by date (newest first)
    mergedRecords.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    // Save real data (overwriting any dummy/mock records)
    saveAttendance(mergedRecords);

    return {
      success: true,
      message: `Berhasil menyinkronkan ${mergedRecords.length} data presensi nyata dari SmartPKL!`,
      data: mergedRecords,
    };
  } catch (err: any) {
    console.error('Error in syncSmartPKLAttendance:', err);
    return {
      success: false,
      message: `Error sinkronisasi SmartPKL: ${err.message}`,
      data: getAttendance(),
    };
  }
}
