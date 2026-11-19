export type CharacterCategory =
  | 'Uppercase'
  | 'Lowercase'
  | 'Number'
  | 'Space'
  | 'Punctuation'
  | 'Symbol';

export interface CharacterIdItem {
  index: number;
  char: string;
  displayChar: string;
  id: number;
  category: CharacterCategory;
}

const PUNCTUATION_LIST = `.,!?;:'"-()[]{}/@#$%^&*_+=<>~\\|\``;

const PUNCTUATION_MAP = new Map<string, number>(
  Array.from(PUNCTUATION_LIST).map((ch, idx) => [ch, 64 + idx]),
);

export function getCharacterCategory(char: string): CharacterCategory {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) return 'Uppercase';
  if (code >= 97 && code <= 122) return 'Lowercase';
  if (code >= 48 && code <= 57) return 'Number';
  if (char === ' ') return 'Space';
  if (PUNCTUATION_MAP.has(char)) {
    return /[.,!?;:'"()-]/.test(char) ? 'Punctuation' : 'Symbol';
  }
  return 'Symbol';
}

/**
 * Deterministic illustrative character ID mapper:
 * - A-Z -> 1..26 (matches HELLO -> 8, 5, 12, 12, 15)
 * - a-z -> 27..52
 * - 0-9 -> 53..62
 * - Space (' ') -> 63
 * - Common punctuation & symbols -> 64..95
 * - Any other Unicode character -> 200 + codePoint
 */
export function getCharacterId(char: string): number {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return code - 64;
  }
  if (code >= 97 && code <= 122) {
    return 26 + (code - 96);
  }
  if (code >= 48 && code <= 57) {
    return 53 + (code - 48);
  }
  if (char === ' ') {
    return 63;
  }
  const punctId = PUNCTUATION_MAP.get(char);
  if (punctId !== undefined) {
    return punctId;
  }
  const cp = char.codePointAt(0) ?? code;
  return 200 + cp;
}

export function formatCharacterLabel(char: string): string {
  if (char === ' ') return 'SPACE';
  if (char === '\n') return 'NEWLINE';
  if (char === '\t') return 'TAB';
  return char;
}

export function mapTextToCharacterIds(text: string): CharacterIdItem[] {
  const chars = Array.from(text);
  return chars.map((char, index) => ({
    index,
    char,
    displayChar: formatCharacterLabel(char),
    id: getCharacterId(char),
    category: getCharacterCategory(char),
  }));
}
