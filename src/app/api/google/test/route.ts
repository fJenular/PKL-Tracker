import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/storage';
import { testGoogleSheetsConnection } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = getSettings();

    const syncMethod = body.syncMethod || settings.google.syncMethod || 'apps_script';
    const webAppUrl = body.webAppUrl || settings.google.webAppUrl;

    if (syncMethod === 'apps_script') {
      if (!webAppUrl) {
        return NextResponse.json({
          success: false,
          message: 'URL Web App Google Apps Script belum diisi.'
        }, { status: 400 });
      }

      const result = await testGoogleSheetsConnection({
        syncMethod: 'apps_script',
        webAppUrl,
        spreadsheetId: body.spreadsheetId || settings.google.spreadsheetId,
        sheetName: body.sheetName || settings.google.sheetName,
        serviceAccountEmail: '',
        privateKey: '',
        isConfigured: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Koneksi ke Google Apps Script Web App berhasil! Data dapat dikirimkan ke Spreadsheet.',
        data: result,
      });
    }

    // Fallback to Service Account
    const googleConfig = {
      syncMethod: 'service_account' as const,
      webAppUrl: '',
      spreadsheetId: body.spreadsheetId || settings.google.spreadsheetId,
      sheetName: body.sheetName || settings.google.sheetName,
      serviceAccountEmail: body.serviceAccountEmail || settings.google.serviceAccountEmail,
      privateKey: body.privateKey && !body.privateKey.includes('•••')
        ? body.privateKey
        : settings.google.privateKey,
      isConfigured: true
    };

    if (!googleConfig.spreadsheetId) {
      return NextResponse.json({ success: false, message: 'ID Spreadsheet wajib diisi' }, { status: 400 });
    }
    if (!googleConfig.serviceAccountEmail || !googleConfig.privateKey) {
      return NextResponse.json({
        success: false,
        message: 'Kredensial Service Account belum lengkap.'
      }, { status: 400 });
    }

    const result = await testGoogleSheetsConnection(googleConfig);

    return NextResponse.json({
      success: true,
      message: `Berhasil terhubung ke Spreadsheet: "${result.title}"`,
      data: result,
    });
  } catch (error: any) {
    console.error('Google test error:', error);
    let msg = error.message;
    if (msg.includes('The caller does not have permission') || msg.includes('403')) {
      msg = 'Izin ditolak (403). Pastikan email Service Account sudah diundang ke Spreadsheet.';
    }
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
