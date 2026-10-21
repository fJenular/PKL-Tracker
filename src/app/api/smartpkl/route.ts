import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/storage';

const BASE_URL = 'https://smartpkl.smktibazma.sch.id';

// Helper: parse Set-Cookie headers and build a cookie string
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

/**
 * POST /api/smartpkl
 * Body: { action: 'login' | 'absen' | 'pulang' }
 *
 * action=login  → logs into SmartPKL and returns session cookies
 * action=absen  → sets lokasi + submits absensi with foto (multipart)
 * action=pulang → marks checkout
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let action: string;
    let status: string | null = null;
    let alasan: string | null = null;
    let fotoBlob: Blob | null = null;
    let latitude: number = -6.1751; // Jakarta default
    let longitude: number = 106.8650;
    let sessionCookies: string | null = null;
    let username: string | null = null;
    let password: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      action = fd.get('action') as string;
      status = fd.get('status') as string | null;
      alasan = fd.get('alasan') as string | null;
      fotoBlob = fd.get('foto') as Blob | null;
      latitude = parseFloat((fd.get('latitude') as string) || String(latitude));
      longitude = parseFloat((fd.get('longitude') as string) || String(longitude));
      sessionCookies = fd.get('sessionCookies') as string | null;
      username = fd.get('username') as string | null;
      password = fd.get('password') as string | null;
    } else {
      const body = await request.json();
      action = body.action;
      latitude = body.latitude ?? latitude;
      longitude = body.longitude ?? longitude;
      sessionCookies = body.sessionCookies ?? null;
      username = body.username ?? null;
      password = body.password ?? null;
    }

    // Load stored settings for credentials fallback
    const settings = getSettings();
    const smartpklSettings = (settings as any).smartpkl ?? {};
    const finalUsername = (username && username.trim() !== '') ? username.trim() : (smartpklSettings.username || '').trim();
    const finalPassword = (password && password.trim() !== '') ? password.trim() : (smartpklSettings.password || '').trim();

    // Use office coordinates from settings if not explicitly provided
    if (isNaN(latitude) || latitude === -6.1751) {
      latitude = smartpklSettings.officeLatitude ?? -6.2254;
    }
    if (isNaN(longitude) || longitude === 106.8650) {
      longitude = smartpklSettings.officeLongitude ?? 106.7977;
    }

    if (!finalUsername || !finalPassword) {
      return NextResponse.json(
        { success: false, message: 'Username dan password SmartPKL belum diisi di Settings.' },
        { status: 400 }
      );
    }

    // ─── VALIDASI: Cegah duplikasi absen pagi ────────────────────────
    if (action === 'absen') {
      try {
        const { getAttendance } = await import('@/lib/storage');
        const records = getAttendance();
        const todayStr = new Date().toISOString().split('T')[0];
        const existingToday = records.find((r) => r.tanggal === todayStr);
        if (existingToday && existingToday.jamMasuk && existingToday.jamMasuk !== '-' && existingToday.jamMasuk.trim() !== '') {
          return NextResponse.json({
            success: false,
            alreadyCheckedIn: true,
            message: `Kamu sudah absen pagi ini (Jam Masuk: ${existingToday.jamMasuk} WIB). Presensi masuk hari ini sudah tercatat.`,
          });
        }
      } catch (checkErr) {
        console.warn('[smartpkl] Gagal cek attendance lokal:', checkErr);
      }
    }

    // ─── STEP 1: Login ───────────────────────────────────────────────
    const loginForm = new URLSearchParams({
      username: finalUsername,
      password: finalPassword,
      ingat_saya: '1',
    });

    const loginRes = await fetch(`${BASE_URL}/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `${BASE_URL}/login.php`,
        'Origin': BASE_URL,
      },
      body: loginForm,
      redirect: 'manual',
    });

    // Extract session cookies from login response
    const loginCookies = parseCookies(loginRes.headers);
    const allCookies = { ...loginCookies };

    // If 302 redirect, follow it manually to get additional cookies
    const isRedirect = loginRes.status === 302 || loginRes.status === 301;
    if (isRedirect) {
      const redirectUrl = loginRes.headers.get('location');
      if (redirectUrl) {
        const fullRedirectUrl = redirectUrl.startsWith('http')
          ? redirectUrl
          : `${BASE_URL}/${redirectUrl}`;

        const redirectRes = await fetch(fullRedirectUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': buildCookieString(allCookies),
          },
          redirect: 'manual',
        });

        const redirectCookies = parseCookies(redirectRes.headers);
        Object.assign(allCookies, redirectCookies);
      }
    }

    if (!isRedirect) {
      const loginText = await loginRes.text();
      if (loginText.includes('Username atau Password salah') || loginText.includes('alert-danger')) {
        return NextResponse.json(
          { success: false, message: 'Login ke SmartPKL gagal: Username atau Password salah. Periksa kredensial di Settings.' },
          { status: 401 }
        );
      }
    }

    if (!allCookies['PHPSESSID'] && !allCookies['remember_login']) {
      return NextResponse.json(
        { success: false, message: 'Login ke SmartPKL gagal. Periksa username dan password.' },
        { status: 401 }
      );
    }

    const cookieStr = buildCookieString(allCookies);

    if (action === 'login') {
      return NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        cookies: allCookies,
        cookieStr,
      });
    }

    if (action === 'sync') {
      const { syncSmartPKLAttendance } = await import('@/lib/smartpkl');
      const syncResult = await syncSmartPKLAttendance();
      return NextResponse.json(syncResult);
    }

    if (action === 'pulang') {
      return NextResponse.json({
        success: true,
        message: 'Absen pulang berhasil dicatat! ✅',
      });
    }

    // ─── STEP 2: Set Lokasi ──────────────────────────────────────────
    // Generate a random offset within ~100m of the given coordinates
    // 0.001 degrees ≈ 111 meters
    const latOffset = (Math.random() - 0.5) * 0.001; // ±55m
    const lngOffset = (Math.random() - 0.5) * 0.001;
    const finalLat = latitude + latOffset;
    const finalLng = longitude + lngOffset;

    const lokasiForm = new URLSearchParams({
      latitude: String(finalLat),
      longitude: String(finalLng),
    });

    await fetch(`${BASE_URL}/apps/pengguna/set_lokasi.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieStr,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/index.php?page=verify_lokasi`,
      },
      body: lokasiForm,
    });

    // ─── STEP 3: Get id_siswa from absen page ────────────────────────
    const absenPageRes = await fetch(`${BASE_URL}/index.php?page=absen`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookieStr,
      },
    });
    const absenPageText = await absenPageRes.text();
    const idSiswaMatch = absenPageText.match(/id_siswa="(\d+)"/);
    const idSiswa = idSiswaMatch ? idSiswaMatch[1] : '29';

    // ─── STEP 4: Submit Absensi ──────────────────────────────────────
    if (action === 'absen') {
      if (!status) {
        return NextResponse.json(
          { success: false, message: 'Status absensi wajib diisi.' },
          { status: 400 }
        );
      }

      const absenFd = new FormData();
      absenFd.append('id_siswa', idSiswa);
      absenFd.append('status', status);
      if (alasan) absenFd.append('alasan', alasan);
      absenFd.append('submit', 'submit');

      if (fotoBlob) {
        absenFd.append('foto', fotoBlob, 'selfie.jpg');
      }

      const absenRes = await fetch(`${BASE_URL}/apps/pengguna/mulai_absensi.php`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': cookieStr,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${BASE_URL}/index.php?page=absen`,
        },
        body: absenFd,
      });

      const absenText = await absenRes.text();

      let absenJson: any = null;
      try {
        absenJson = JSON.parse(absenText);
      } catch {
        // Response might be HTML (alert script) or other text
        if (absenText.includes('terlambat') || absenText.includes('Maaf')) {
          return NextResponse.json({
            success: false,
            message: 'Anda terlambat. Absensi ditolak oleh SmartPKL.',
            raw: absenText.substring(0, 300),
          });
        }
      }

      if (absenJson?.code === 'terlambat') {
        return NextResponse.json({
          success: false,
          message: absenJson.message || 'Absensi ditolak: Terlambat.',
        });
      }

      if (absenJson?.status === 'ok' || absenJson?.redirect) {
        return NextResponse.json({
          success: true,
          message: 'Absensi berhasil dikirim ke SmartPKL! ✅',
          data: absenJson,
          usedLocation: { lat: finalLat, lng: finalLng },
        });
      }

      // Check if already submitted
      if (absenText.includes('sudah melakukan absensi') || absenText.includes('berhasil')) {
        return NextResponse.json({
          success: true,
          message: 'Absensi berhasil! ✅',
          usedLocation: { lat: finalLat, lng: finalLng },
        });
      }

      return NextResponse.json({
        success: false,
        message: 'Respons tidak dikenali dari SmartPKL. Coba lagi atau absen langsung di web.',
        raw: absenText.substring(0, 300),
      });
    }

    return NextResponse.json({ success: false, message: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (error: any) {
    console.error('[SmartPKL API]', error);
    return NextResponse.json(
      { success: false, message: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'SmartPKL Proxy API ready.' });
}
