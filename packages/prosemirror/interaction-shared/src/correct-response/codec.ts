export type CorrectResponseValue = string | string[] | null;

// qti-components convention: comma-separated, trimmed. No escape mechanism —
// answer values containing literal commas cannot round-trip.
export function parseCorrectResponseAttribute(raw: string | null | undefined): CorrectResponseValue {
  if (raw == null) return null;
  if (!raw.includes(',')) {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const tokens = raw.split(',').map(token => token.trim()).filter(token => token.length > 0);
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return tokens[0];
  return tokens;
}

// Strip commas: the attribute format is comma-separated with no escape
// mechanism, so a literal comma inside a token would corrupt parsing.
function stripCommas(token: string): string {
  return token.replace(/,/g, '');
}

export function serializeCorrectResponseAttribute(value: CorrectResponseValue): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const tokens = value.map(token => stripCommas(token).trim()).filter(token => token.length > 0);
    return tokens.length > 0 ? tokens.join(',') : null;
  }
  const trimmed = stripCommas(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}
