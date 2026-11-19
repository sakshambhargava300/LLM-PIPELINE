import { getEncoding, type Tiktoken } from 'js-tiktoken';
import { findVocabularyEntry, type VocabularyEntry } from './vocabulary';

export type TokenCategory = 'word' | 'subword' | 'punctuation' | 'whitespace';

export interface TokenItem {
  index: number;
  id: number;
  text: string;
  displayText: string;
  category: TokenCategory;
  vocabMatch: VocabularyEntry | null;
}

let cachedEncoding: Tiktoken | null = null;

function getTokenizerEncoding(): Tiktoken {
  if (!cachedEncoding) {
    cachedEncoding = getEncoding('cl100k_base');
  }
  return cachedEncoding;
}

function classifyToken(tokenText: string, prevTokenText: string | null): TokenCategory {
  if (/^\s+$/.test(tokenText)) {
    return 'whitespace';
  }
  const trimmed = tokenText.trim();
  if (/^[\p{P}\p{S}]+$/u.test(trimmed)) {
    return 'punctuation';
  }
  // In BPE tokenizers, word-internal continuation tokens typically start without leading space
  // after an alphanumeric token.
  const startsWithoutSpace = !tokenText.startsWith(' ') && !tokenText.startsWith('\n');
  const prevEndedWithAlphaNum =
    prevTokenText !== null && /[\p{L}\p{N}]$/u.test(prevTokenText);
  if (startsWithoutSpace && prevEndedWithAlphaNum) {
    return 'subword';
  }
  return 'word';
}

export function formatTokenDisplay(tokenText: string): string {
  return tokenText.replace(/ /g, '␣').replace(/\n/g, '↵').replace(/\t/g, '→');
}

export function tokenizeText(
  text: string,
  vocabulary: VocabularyEntry[] = [],
): TokenItem[] {
  if (!text) return [];
  const enc = getTokenizerEncoding();
  const ids = enc.encode(text);

  const items: TokenItem[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const tokenText = enc.decode([id]);
    const prevText = i > 0 ? items[i - 1].text : null;
    const category = classifyToken(tokenText, prevText);
    const vocabMatch = findVocabularyEntry(vocabulary, tokenText);

    items.push({
      index: i,
      id,
      text: tokenText,
      displayText: formatTokenDisplay(tokenText),
      category,
      vocabMatch,
    });
  }

  return items;
}
