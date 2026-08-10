const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

export function csvCell(value) {
  const normalized = String(value ?? '').replace(/_/g, ' ');
  const safeValue = FORMULA_PREFIX_PATTERN.test(normalized.trimStart())
    ? `'${normalized}`
    : normalized;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function downloadCSV(filename, headers, rows) {
  const csv = [headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
