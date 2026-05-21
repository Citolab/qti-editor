export function parseCorrectResponse(value: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map(entry => String(entry).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}
