export interface VocabularyEntry {
  id: number;
  word: string;
}

export interface VocabularyState {
  entries: VocabularyEntry[];
  nextId: number;
}

export interface VocabularyActionResult {
  state: VocabularyState;
  error: string | null;
  addedEntry?: VocabularyEntry;
}

export const STARTER_VOCABULARY_WORDS = [
  'CAT',
  'DOG',
  'APPLE',
  'BOOK',
  'BANK',
  'RIVER',
  'MONEY',
  'AI',
] as const;

export function createInitialVocabularyState(): VocabularyState {
  const entries = STARTER_VOCABULARY_WORDS.map((word, idx) => ({
    id: idx + 1,
    word,
  }));
  return {
    entries,
    nextId: entries.length + 1,
  };
}

export function normalizeVocabularyWord(rawInput: string): string {
  return rawInput.trim().toUpperCase();
}

export function addVocabularyWord(
  state: VocabularyState,
  rawInput: string,
): VocabularyActionResult {
  const normalized = normalizeVocabularyWord(rawInput);

  if (!normalized) {
    return {
      state,
      error: 'Please enter a word before adding to the vocabulary.',
    };
  }

  if (/\s/.test(normalized)) {
    return {
      state,
      error: 'Please enter a single word without spaces.',
    };
  }

  const existing = state.entries.find((entry) => entry.word === normalized);
  if (existing) {
    return {
      state,
      error: `"${normalized}" is already in the vocabulary (ID: ${existing.id}).`,
    };
  }

  const addedEntry: VocabularyEntry = {
    id: state.nextId,
    word: normalized,
  };

  return {
    state: {
      entries: [...state.entries, addedEntry],
      nextId: state.nextId + 1,
    },
    error: null,
    addedEntry,
  };
}

export function removeVocabularyWord(
  state: VocabularyState,
  idToRemove: number,
): VocabularyState {
  return {
    entries: state.entries.filter((entry) => entry.id !== idToRemove),
    nextId: state.nextId,
  };
}

export function clearVocabulary(state: VocabularyState): VocabularyState {
  return {
    entries: [],
    nextId: state.nextId,
  };
}

export function restoreStarterVocabulary(state: VocabularyState): VocabularyState {
  let nextState = state;
  for (const starterWord of STARTER_VOCABULARY_WORDS) {
    const exists = nextState.entries.some((e) => e.word === starterWord);
    if (!exists) {
      nextState = {
        entries: [...nextState.entries, { id: nextState.nextId, word: starterWord }],
        nextId: nextState.nextId + 1,
      };
    }
  }
  return nextState;
}

export function findVocabularyEntry(
  entries: VocabularyEntry[],
  wordOrToken: string,
): VocabularyEntry | null {
  const normalized = wordOrToken.trim().toUpperCase();
  if (!normalized) return null;
  return entries.find((entry) => entry.word === normalized) ?? null;
}
