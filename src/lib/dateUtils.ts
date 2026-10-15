const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export function getHariFromDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return INDONESIAN_DAYS[date.getDay()];
}

export function formatDateToIndonesian(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${INDONESIAN_MONTHS[monthIndex]} ${year}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateToSpreadsheet(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getBulanFromDate(dateString: string): string {
  if (!dateString) return 'Oktober';
  const parts = dateString.split('-');
  if (parts.length >= 2) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return INDONESIAN_MONTHS[monthIndex];
    }
  }
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return INDONESIAN_MONTHS[date.getMonth()];
  }
  return 'Oktober';
}

export function getMonthYearKey(dateString: string): string {
  if (!dateString) return '2026-10';
  const parts = dateString.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }
  return '2026-10';
}

export function getBulanTahunFromDate(dateString: string): string {
  if (!dateString) return 'Oktober 2026';
  const parts = dateString.split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${INDONESIAN_MONTHS[monthIndex]} ${year}`;
    }
  }
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return `${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return 'Oktober 2026';
}

export function formatMonthRange(dateFrom?: string, dateTo?: string): string {
  if (!dateFrom && !dateTo) return 'Oktober 2026';
  if (dateFrom && !dateTo) return getBulanTahunFromDate(dateFrom);
  if (!dateFrom && dateTo) return getBulanTahunFromDate(dateTo);

  const startBt = getBulanTahunFromDate(dateFrom!);
  const endBt = getBulanTahunFromDate(dateTo!);

  if (startBt === endBt) {
    return startBt;
  }

  const [startMonth, startYear] = startBt.split(' ');
  const [endMonth, endYear] = endBt.split(' ');

  if (startYear === endYear) {
    return `${startMonth} - ${endMonth} ${startYear}`;
  }
  return `${startBt} - ${endBt}`;
}

export function formatDateSlash(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  return dateString;
}

export function calculateTotalHariPKL(endDateStr: string, startDateStr: string = '2026-08-03'): number {
  if (!endDateStr) return 0;
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endDateStr.split('-').map(Number);
  if (startParts.length !== 3 || endParts.length !== 3) return 0;

  const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
  const endUtc = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);

  if (endUtc < startUtc) return 0;

  const diffDays = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}
