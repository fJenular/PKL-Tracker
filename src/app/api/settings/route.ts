import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/storage';

export async function GET() {
  try {
    const settings = getSettings();
    const safeSettings = {
      ...settings,
      google: {
        ...settings.google,
        privateKey: settings.google.privateKey ? '••••••••••••••••' : '',
        hasPrivateKey: !!settings.google.privateKey
      }
    };
    return NextResponse.json({ success: true, data: safeSettings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentSettings = getSettings();

    let googleConfig = { ...currentSettings.google };

    if (body.google) {
      const syncMethod = body.google.syncMethod || currentSettings.google.syncMethod || 'apps_script';
      const webAppUrl = body.google.webAppUrl !== undefined ? body.google.webAppUrl : currentSettings.google.webAppUrl;

      googleConfig = {
        ...currentSettings.google,
        ...body.google,
        syncMethod,
        webAppUrl,
        privateKey: (body.google.privateKey && !body.google.privateKey.includes('•••'))
          ? body.google.privateKey
          : currentSettings.google.privateKey
      };

      if (syncMethod === 'apps_script') {
        googleConfig.isConfigured = !!webAppUrl;
      } else {
        googleConfig.isConfigured = !!(
          googleConfig.spreadsheetId &&
          googleConfig.serviceAccountEmail &&
          googleConfig.privateKey
        );
      }
    }

    const newSettings = {
      profile: {
        ...currentSettings.profile,
        ...(body.profile || {})
      },
      google: googleConfig
    };

    saveSettings(newSettings);

    return NextResponse.json({
      success: true,
      message: 'Pengaturan berhasil disimpan!',
      data: {
        ...newSettings,
        google: {
          ...newSettings.google,
          privateKey: newSettings.google.privateKey ? '••••••••••••••••' : '',
          hasPrivateKey: !!newSettings.google.privateKey
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
