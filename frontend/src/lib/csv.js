const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r\n]/;
const CELL_ADDRESS_PATTERN = /^[A-Z]+[1-9]\d*$/;
const SENSITIVE_FIELD_PATTERN = /^(a+dha+r|a+dha+r_?(no|number)?|aadhar|aadhar_?(no|number)?|adhar|adhar_?(no|number)?)$/i;

export function isSensitiveExportKey(key) {
  return SENSITIVE_FIELD_PATTERN.test(String(key || '').replace(/[\s-]+/g, '_'));
}

export function spreadsheetCell(value) {
  const normalized = String(value ?? '').replace(/_/g, ' ');
  return FORMULA_PREFIX_PATTERN.test(normalized.trimStart()) ? `'${normalized}` : normalized;
}

export function sanitizeSpreadsheetRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => !isSensitiveExportKey(key))
        .map(([key, value]) => [key, spreadsheetCell(value)])
    )
  );
}

export function csvCell(value) {
  const safeValue = spreadsheetCell(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function sanitizeWorksheetCells(worksheet) {
  Object.keys(worksheet || {}).forEach((address) => {
    if (!CELL_ADDRESS_PATTERN.test(address)) return;
    const cell = worksheet[address];
    if (!cell || cell.v == null) return;
    cell.v = spreadsheetCell(cell.v);
    cell.t = 's';
    delete cell.f;
    delete cell.F;
    delete cell.D;
    cell.z = '@';
  });
  return worksheet;
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
