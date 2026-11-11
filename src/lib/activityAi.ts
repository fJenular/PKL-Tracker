/**
 * activityAi.ts
 * AI-powered assistant for formulating professional, descriptive PKL activity logs.
 * Formats brief student inputs into formal, standard Indonesian matching school & corporate requirements
 * (SMK TI BAZMA & DU/DI standards, e.g. "Melakukan instalasi...", "Mengikuti...", "Memeriksa dan menangani...").
 */

export interface AiSuggestionResult {
  formal: string;       // Single polished formal sentence with purpose & context
  bulletPoints: string; // Bullet-point structured breakdown
  operational: string;  // Concise operational/troubleshooting phrasing
}

// Common patterns & expansions from official logbook guidelines (Image 5)
interface TemplateRule {
  keywords: string[];
  formal: (input: string) => string;
  bulletPoints: (input: string) => string;
  operational: (input: string) => string;
}

const TEMPLATE_RULES: TemplateRule[] = [
  // SAP installation / configuration
  {
    keywords: ['sap', 'install sap', 'aplikasi sap'],
    formal: () => 'Melakukan instalasi aplikasi SAP pada perangkat komputer untuk mendukung kebutuhan operasional pengguna.',
    bulletPoints: () => `- Melakukan instalasi aplikasi SAP untuk memenuhi kebutuhan pengguna.\n- Melakukan pengujian fungsi dan verifikasi akses sistem SAP pada perangkat kerja.\n- Memastikan aplikasi SAP siap digunakan untuk aktivitas operasional harian.`,
    operational: () => 'Melakukan instalasi dan konfigurasi aplikasi SAP pada perangkat komputer pengguna sesuai prosedur standar IT.'
  },
  // Wi-Fi / Jaringan / Internet
  {
    keywords: ['wifi', 'wi-fi', 'internet', 'koneksi', 'jaringan lemot', 'benerin wifi', 'troubleshoot wifi'],
    formal: () => 'Melakukan troubleshooting untuk memperbaiki kendala akses jaringan Wi-Fi guna menjaga kelancaran koneksi internet.',
    bulletPoints: () => `- Melakukan troubleshooting untuk memperbaiki kendala akses jaringan Wi-Fi.\n- Melakukan pengecekan sinyal dan reset konfigurasi access point (AP).\n- Melakukan uji stabilitas koneksi jaringan untuk memastikan perangkat terhubung kembali dengan baik.`,
    operational: () => 'Melakukan penanganan kendala koneksi Wi-Fi dan pemulihan akses internet pada perangkat pengguna.'
  },
  // DNS / VPN / P2P
  {
    keywords: ['dns', 'vpn', 'p2p', 'koneksi vpn'],
    formal: () => 'Melakukan konfigurasi DNS dan pengaturan VPN agar konektivitas jaringan serta akses layanan internal dapat berjalan dengan baik.',
    bulletPoints: () => `- Melakukan konfigurasi DNS untuk mendukung konektivitas layanan P2P.\n- Melakukan konfigurasi DNS agar koneksi VPN dapat berjalan dengan baik.\n- Melakukan verifikasi keamanan dan stabilitas jalur tunneling VPN.`,
    operational: () => 'Melakukan konfigurasi DNS dan verifikasi konektivitas VPN untuk mendukung operasional kerja jarak jauh.'
  },
  // Scanner
  {
    keywords: ['scanner', 'scan', 'scaner'],
    formal: () => 'Melakukan pemeriksaan dan penanganan kendala scanner yang tidak dapat terhubung atau digunakan melalui laptop pengguna.',
    bulletPoints: () => `- Melakukan troubleshooting untuk mengatasi kendala pada perangkat scanner.\n- Melakukan update/instalasi ulang driver scanner pada perangkat laptop pengguna.\n- Melakukan uji coba pemindaian (test scan) dokumen untuk memastikan perangkat berfungsi normal.`,
    operational: () => 'Melakukan troubleshooting perangkat scanner dan pembaruan driver agar dapat terhubung kembali ke perangkat kerja.'
  },
  // Printer
  {
    keywords: ['printer', 'print', 'cetak', 'tinta', 'toner'],
    formal: () => 'Melakukan penanganan kendala teknis pada perangkat printer dan pengujian cetak dokumen untuk memastikan kelancaran operasional.',
    bulletPoints: () => `- Melakukan troubleshooting perangkat printer yang mengalami kendala konektivitas/paper jam.\n- Melakukan pengecekan status tinta/toner dan membersihkan komponen pemintas printer.\n- Melakukan test print dari komputer pengguna untuk memastikan hasil cetak optimal.`,
    operational: () => 'Melakukan pemeliharaan dan perbaikan printer agar dapat digunakan kembali oleh staf kerja.'
  },
  // Serah terima laptop / perangkat
  {
    keywords: ['serah terima', 'handover', 'laptop magang', 'bagi laptop', 'kasih laptop'],
    formal: () => 'Melakukan serah terima laptop kepada pengguna/peserta magang dan memastikan kelengkapan inventaris serta kesiapan pakai perangkat.',
    bulletPoints: () => `- Melakukan serah terima laptop kepada peserta magang bagian Keuangan.\n- Melakukan pengecekan fisik, kelengkapan adaptor charger, dan verifikasi spesifikasi perangkat.\n- Mendokumentasikan form tanda terima penyerahan aset perangkat IT.`,
    operational: () => 'Melakukan serah terima dan verifikasi kelengkapan laptop kerja sebelum diserahkan kepada staf/peserta magang.'
  },
  // User account / Active Directory / Akun internet
  {
    keywords: ['buat akun', 'akun user', 'user baru', 'bikin user', 'akses internet', 'tambah user'],
    formal: () => 'Membuat dan mengonfigurasi akun pengguna (user) untuk memperoleh akses jaringan internet serta layanan kerja internal.',
    bulletPoints: () => `- Membuat dan mengonfigurasi akun pengguna (user) untuk memperoleh akses jaringan internet.\n- Menetapkan hak akses (permission level) sesuai divisi dan kebutuhan kerja.\n- Memberikan instruksi login dan panduan kredensial kepada pengguna baru.`,
    operational: () => 'Membuat akun pengguna baru dan mengonfigurasi otorisasi akses jaringan sesuai kebijakan perusahaan.'
  },
  // Email / Password / Kredensial
  {
    keywords: ['email', 'password', 'kredensial', 'reset password', 'ganti password', 'verifikasi password'],
    formal: () => 'Melakukan verifikasi dan pembaruan password email pengguna untuk memastikan kredensial akun dapat digunakan dan akses email berjalan dengan baik.',
    bulletPoints: () => `- Melakukan verifikasi password email MK untuk memastikan kredensial akun dapat digunakan dan akses email berjalan dengan baik.\n- Melakukan reset kata sandi serta pengaturan verifikasi keamanan dua langkah (2FA).\n- Membantu konfigurasi akun email pada aplikasi client (Outlook/Webmail).`,
    operational: () => 'Melakukan reset dan verifikasi password email pengguna untuk memulihkan akses komunikasi kerja.'
  },
  // Mini PC / Komputer / PC / Hardware test
  {
    keywords: ['mini pc', 'pengujian pc', 'test pc', 'uji fungsi', 'performa pc'],
    formal: () => 'Melakukan pengujian fungsi dan performa perangkat Mini PC untuk memastikan perangkat berjalan dengan baik dan siap digunakan.',
    bulletPoints: () => `- Melakukan pengujian fungsi dan performa perangkat Mini PC untuk memastikan perangkat berjalan dengan baik.\n- Melakukan pemeriksaan komponen hardware (RAM, SSD, temperatur suhu processor).\n- Melakukan instalasi sistem operasi dan aplikasi dasar operasional.`,
    operational: () => 'Melakukan uji fungsionalitas dan pengecekan performa perangkat komputer sebelum didistribusikan.'
  },
  // TV Monitoring / Display
  {
    keywords: ['tv', 'monitoring', 'layar monitoring', 'aac', 'customer care', 'display'],
    formal: () => 'Melakukan konfigurasi TV yang digunakan sebagai media monitoring pada bagian AAC (Customer Care) untuk memantau aktivitas operasional.',
    bulletPoints: () => `- Melakukan konfigurasi TV yang digunakan sebagai media monitoring pada bagian AAC (Customer Care).\n- Mengatur koneksi display cable/HDMI serta sinkronisasi dashboard pemantauan.\n- Memastikan visual data monitoring tampil secara stabil dan berkelanjutan.`,
    operational: () => 'Melakukan setting dan koneksi display monitor TV untuk pemantauan realtime divisi pelayanan.'
  },
  // ISO / Pelatihan / Webinar / Training
  {
    keywords: ['iso', 'iso 27001', 'pelatihan', 'training', 'keamanan informasi', 'awareness'],
    formal: () => 'Mengikuti pelatihan Awareness ISO 27001 untuk memahami standar keamanan informasi dan kepatuhan sistem di lingkungan perusahaan.',
    bulletPoints: () => `- Mengikuti pelatihan Awareness ISO 27001 untuk memahami standar keamanan informasi di lingkungan perusahaan.\n- Mempelajari protokol perlindungan data rahasia dan mitigasi risiko siber internal.\n- Mencatat poin evaluasi kepatuhan prosedur operasional standar (SOP) IT.`,
    operational: () => 'Mengikuti sesi pelatihan kepatuhan standar keamanan data ISO 27001 bagi personel divisi IT.'
  },
  // Kabel LAN / Jaringan fisik
  {
    keywords: ['kabel', 'lan', 'crimping', 'rj45', 'tarik kabel', 'patch cord', 'switch'],
    formal: () => 'Melakukan pemasangan dan terminasi kabel jaringan LAN (UTP/RJ45) untuk memastikan konektivitas fisik antar-perangkat berjalan stabil.',
    bulletPoints: () => `- Melakukan penarikan dan penataan kabel UTP dari switch ke meja kerja pengguna.\n- Melakukan crimping konektor RJ45 dan pengujian kesinambungan sinyal dengan LAN tester.\n- Memastikan port jaringan pada switch terdaftar dan berfungsi dengan normal.`,
    operational: () => 'Melakukan instalasi dan pengetesan kabel jaringan LAN untuk perluasan koneksi komputer kerja.'
  },
  // Backup / Cadangan data
  {
    keywords: ['backup', 'cadangkan', 'cadangan', 'arsip data'],
    formal: () => 'Melakukan proses backup data sistem dan verifikasi integritas file cadangan guna mencegah risiko kehilangan data penting perusahaan.',
    bulletPoints: () => `- Melakukan proses backup berkala data operasional ke media penyimpanan eksternal/server cadangan.\n- Memeriksa kelengkapan file arsip dan log riwayat backup harian.\n- Memastikan sistem pemulihan data (restore point) berfungsi dengan baik.`,
    operational: () => 'Melakukan backup data rutin dan pengecekan kapasitas media penyimpanan untuk keamanan data.'
  },
  // Maintenance / Pembersihan PC
  {
    keywords: ['maintenance', 'pemeliharaan', 'bersihin pc', 'debu', 'ganti thermal'],
    formal: () => 'Melakukan pemeliharaan berkala pada perangkat komputer kerja guna menjaga performa dan keawetan komponen perangkat keras.',
    bulletPoints: () => `- Membersihkan debu dan kotoran pada kipas pendingin serta casing komputer.\n- Melakukan pengecekan kesehatan media penyimpanan (HDD/SSD) dan memori RAM.\n- Menghapus temporary files serta melakukan update sistem keamanan Windows.`,
    operational: () => 'Melakukan preventive maintenance perangkat komputer untuk mengoptimalkan kinerja kerja harian.'
  }
];

/**
 * Intelligent grammatical transformer for custom / unlisted student inputs.
 */
function synthesizeIndonesianPKL(rawInput: string): AiSuggestionResult {
  const clean = rawInput.trim();
  if (!clean) {
    return {
      formal: 'Melakukan kegiatan operasional dan pemeliharaan teknis sesuai arahan pembimbing industri.',
      bulletPoints: '- Melakukan pemeriksaan dan pengujian sistem operasional.\n- Mendokumentasikan hasil pekerjaan harian.',
      operational: 'Melakukan pemeliharaan operasional harian di lingkungan kerja.'
    };
  }

  // 1. Check direct keyword match against official templates
  const lower = clean.toLowerCase();
  for (const rule of TEMPLATE_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return {
        formal: rule.formal(clean),
        bulletPoints: rule.bulletPoints(clean),
        operational: rule.operational(clean)
      };
    }
  }

  // 2. Multi-item input detection (comma, newline, or "dan")
  const splitItems = clean.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (splitItems.length > 1) {
    const formattedPoints = splitItems.map(item => {
      return `- ${transformSingleClause(item)}`;
    }).join('\n');

    return {
      formal: `Melakukan ${clean.replace(/^(benerin|cek|install|setting)\s+/i, '')} untuk mendukung kelancaran kebutuhan operasional pengguna.`,
      bulletPoints: formattedPoints,
      operational: `Melakukan penanganan teknis dan koordinasi tugas: ${splitItems.map(s => s.toLowerCase()).join(', ')}.`
    };
  }

  // 3. Single sentence smart transformation
  const polished = transformSingleClause(clean);
  return {
    formal: `${polished} untuk mendukung kelancaran operasional pengguna dan menjaga keandalan sistem.`,
    bulletPoints: `- ${polished}.\n- Melakukan verifikasi dan pengujian fungsi setelah pengerjaan selesai.\n- Memastikan hasil pekerjaan sesuai dengan standar operasional yang berlaku.`,
    operational: `${polished} pada perangkat/sistem terkait sesuai prosedur standar IT.`
  };
}

function transformSingleClause(text: string): string {
  let s = text.trim();
  if (!s) return 'Melakukan kegiatan operasional harian';

  // Verb replacement / normalization
  s = s.replace(/^(benerin|perbaiki|rusak|kendala|error)\s+/i, 'Melakukan troubleshooting kendala ');
  s = s.replace(/^(setting|seting|konfigurasi|config)\s+/i, 'Melakukan konfigurasi ');
  s = s.replace(/^(install|instal|pasang)\s+/i, 'Melakukan instalasi ');
  s = s.replace(/^(cek|periksa|pemeriksaan)\s+/i, 'Melakukan pengecekan dan pemeriksaan ');
  s = s.replace(/^(uji|test|testing)\s+/i, 'Melakukan pengujian fungsi ');
  s = s.replace(/^(buat|bikin|tambah)\s+/i, 'Membuat dan mengonfigurasi ');
  s = s.replace(/^(ikut|ikutan|pelatihan|training)\s+/i, 'Mengikuti kegiatan ');
  s = s.replace(/^(ganti|tukar)\s+/i, 'Melakukan penggantian komponen ');
  s = s.replace(/^(tarik|pasang kabel)\s+/i, 'Melakukan instalasi kabel ');
  s = s.replace(/^(bersihin|bersihkan)\s+/i, 'Melakukan pemeliharaan dan pembersihan ');

  // If didn't start with standard verb, prepend "Melakukan"
  if (!/^(Melakukan|Mengikuti|Membuat|Melaksanakan|Membantu)/i.test(s)) {
    s = `Melakukan ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  }

  // Ensure first char capitalized
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

/**
 * Public function to generate AI suggestions for task description.
 */
export async function getAiActivitySuggestions(input: string): Promise<AiSuggestionResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      formal: 'Melakukan instalasi aplikasi SAP pada perangkat komputer untuk mendukung kebutuhan operasional pengguna.',
      bulletPoints: `- Melakukan troubleshooting untuk memperbaiki kendala akses jaringan Wi-Fi.\n- Melakukan konfigurasi DNS agar koneksi VPN dapat berjalan dengan baik.`,
      operational: 'Melakukan pengujian fungsi dan performa perangkat Mini PC untuk memastikan perangkat berjalan dengan baik.'
    };
  }

  // Try calling server-side API (which may enhance via Gemini if available)
  try {
    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.suggestions) {
        return {
          formal: data.suggestions[0] || synthesizeIndonesianPKL(trimmed).formal,
          bulletPoints: data.suggestions[1] || synthesizeIndonesianPKL(trimmed).bulletPoints,
          operational: data.suggestions[2] || synthesizeIndonesianPKL(trimmed).operational
        };
      }
    }
  } catch {
    // Silently proceed to local synthesis
  }

  // Fast offline local synthesizer
  return synthesizeIndonesianPKL(trimmed);
}

/**
 * Preset quick inspiration tags inspired by Image 5
 */
export const QUICK_ACTIVITY_CHIPS = [
  { label: 'Instalasi SAP', query: 'install sap', text: 'Melakukan instalasi aplikasi SAP pada perangkat komputer untuk mendukung kebutuhan operasional pengguna.' },
  { label: 'Troubleshoot Wi-Fi', query: 'troubleshoot wifi', text: 'Melakukan troubleshooting untuk memperbaiki kendala akses jaringan Wi-Fi.' },
  { label: 'Konfigurasi DNS & VPN', query: 'setting dns vpn', text: '- Melakukan konfigurasi DNS untuk mendukung konektivitas layanan P2P.\n- Melakukan konfigurasi DNS agar koneksi VPN dapat berjalan dengan baik.' },
  { label: 'Perbaikan Scanner', query: 'kendala scanner', text: '- Melakukan troubleshooting untuk mengatasi kendala pada perangkat scanner.\n- Melakukan pemeriksaan dan penanganan kendala scanner yang tidak dapat terhubung atau digunakan melalui laptop.' },
  { label: 'Serah Terima Laptop', query: 'serah terima laptop', text: 'Melakukan serah terima laptop kepada peserta magang bagian Keuangan dan mendokumentasikan form tanda terima.' },
  { label: 'Uji Fungsi Mini PC', query: 'uji mini pc', text: 'Melakukan pengujian fungsi dan performa perangkat Mini PC untuk memastikan perangkat berjalan dengan baik.' },
  { label: 'TV Media Monitoring', query: 'konfigurasi tv monitoring', text: 'Melakukan konfigurasi TV yang digunakan sebagai media monitoring pada bagian AAC (Customer Care).' },
  { label: 'Verifikasi Password Email', query: 'verifikasi password email', text: 'Melakukan verifikasi password email MK untuk memastikan kredensial akun dapat digunakan dan akses email berjalan dengan baik.' },
  { label: 'Pelatihan ISO 27001', query: 'pelatihan iso 27001', text: 'Mengikuti pelatihan Awareness ISO 27001 untuk memahami standar keamanan informasi di lingkungan perusahaan.' },
  { label: 'Akun Pengguna Internet', query: 'buat akun internet', text: 'Membuat dan mengonfigurasi akun pengguna (user) untuk memperoleh akses jaringan internet.' }
];

