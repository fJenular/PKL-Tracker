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
      },
      smartpkl: {
        ...settings.smartpkl,
        password: settings.smartpkl?.password ? '••••••••' : '',
        hasPassword: !!(settings.smartpkl?.password)
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

    // Handle SmartPKL settings
    let smartpklConfig = { ...currentSettings.smartpkl };
    if (body.smartpkl) {
      smartpklConfig = {
        ...currentSettings.smartpkl,
        ...body.smartpkl,
        // Only update password if it's not masked
        password: (body.smartpkl.password && !body.smartpkl.password.includes('•'))
          ? body.smartpkl.password
          : currentSettings.smartpkl?.password || ''
      };
      smartpklConfig.isConfigured = !!(smartpklConfig.username && smartpklConfig.password);
    }

    const newSettings = {
      profile: {
        ...currentSettings.profile,
        ...(body.profile || {})
      },
      google: googleConfig,
      smartpkl: smartpklConfig
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
        },
        smartpkl: {
          ...newSettings.smartpkl,
          password: newSettings.smartpkl?.password ? '••••••••' : '',
          hasPassword: !!(newSettings.smartpkl?.password)
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
