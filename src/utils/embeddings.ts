export const SAMPLE_SENTENCES = [
  'The cat is sitting on the mat.',
  'The dog is running in the garden.',
  'Artificial Intelligence is transforming the world.',
  'I love learning about Large Language Models.',
] as const;

export const STATIC_VS_CONTEXTUAL_SENTENCES = [
  'She deposited money in the bank.',
  'The fisherman sat on the bank of the river.',
] as const;

export const EMBEDDING_DIMENSIONS = [
  'Living',
  'Finance',
  'Nature',
  'Action',
  'Tech',
  'Object',
  'Abstract',
  'Syntax',
] as const;

const PRESET_VECTORS: Record<string, number[]> = {
  CAT: [0.24, -0.61, 0.83, 0.17, 0.42, -0.19, 0.55, -0.31],
  DOG: [0.29, -0.58, 0.79, 0.22, 0.38, -0.21, 0.51, -0.28],
  APPLE: [0.14, -0.12, 0.61, -0.35, -0.44, 0.77, 0.11, -0.09],
  BOOK: [-0.21, 0.15, -0.18, 0.08, 0.31, 0.84, 0.46, 0.12],
  BANK: [0.05, 0.14, 0.11, 0.19, -0.25, 0.41, 0.09, -0.16],
  RIVER: [-0.34, -0.65, 0.89, 0.24, -0.41, -0.22, 0.19, -0.07],
  MONEY: [-0.18, 0.87, -0.58, 0.33, 0.14, 0.48, 0.26, -0.12],
  AI: [-0.45, 0.39, -0.51, 0.27, 0.92, -0.15, 0.68, 0.18],
  MAT: [-0.11, -0.19, 0.15, -0.28, -0.31, 0.74, -0.14, 0.09],
  GARDEN: [-0.08, -0.49, 0.81, 0.12, -0.37, 0.26, 0.18, -0.11],
  SITTING: [0.35, -0.14, 0.19, 0.78, -0.22, 0.05, -0.11, 0.31],
  RUNNING: [0.41, -0.11, 0.24, 0.86, -0.18, -0.07, -0.09, 0.27],
  ARTIFICIAL: [-0.42, 0.31, -0.49, 0.18, 0.88, -0.11, 0.73, 0.14],
  INTELLIGENCE: [-0.38, 0.34, -0.44, 0.22, 0.89, -0.09, 0.79, 0.21],
  TRANSFORMING: [-0.22, 0.28, -0.19, 0.79, 0.64, -0.14, 0.56, 0.25],
  WORLD: [0.16, 0.12, 0.64, 0.09, 0.21, 0.32, 0.59, -0.06],
  LOVE: [0.68, 0.04, 0.19, 0.44, -0.15, -0.21, 0.76, 0.12],
  LEARNING: [0.47, 0.19, -0.08, 0.69, 0.51, 0.24, 0.62, 0.18],
  LARGE: [-0.19, 0.14, 0.23, -0.11, 0.48, 0.39, 0.34, 0.29],
  LANGUAGE: [-0.12, 0.16, -0.14, 0.25, 0.74, 0.28, 0.67, 0.54],
  MODELS: [-0.39, 0.33, -0.46, 0.19, 0.87, 0.14, 0.58, 0.22],
};

function hashWord(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generates a consistent, reproducible 8D illustrative embedding vector
 * for any token or vocabulary word.
 */
export function getIllustrativeEmbedding(rawWordOrToken: string): number[] {
  const cleaned = rawWordOrToken.trim().toUpperCase();
  if (!cleaned) {
    return [0.02, -0.04, 0.01, -0.03, 0.05, -0.01, 0.03, 0.89];
  }

  if (PRESET_VECTORS[cleaned]) {
    return [...PRESET_VECTORS[cleaned]];
  }

  let seed = hashWord(cleaned);
  const vector: number[] = [];
  for (let i = 0; i < EMBEDDING_DIMENSIONS.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const unit = (seed / 0xffffffff) * 1.8 - 0.9;
    vector.push(Math.round(unit * 100) / 100);
  }
  return vector;
}

export function formatVectorPreview(vector: number[], count = 4): string {
  const slice = vector.slice(0, count).map((v) => v.toFixed(2));
  return `[${slice.join(', ')}, ...]`;
}

export type EmbeddingPointGroup = 'target' | 'finance' | 'river';

export interface ComparisonEmbeddingItem {
  id: string;
  label: string;
  word: string;
  sentence: string;
  group: EmbeddingPointGroup;
  colorHex: string;
  vector: number[];
  note: string;
}

// Static (Word2Vec): "bank" has one single fixed vector regardless of context.
const STATIC_BANK_VECTOR = [0.05, 0.14, 0.11, 0.19, -0.25, 0.41, 0.09, -0.16];

export const WORD2VEC_EMBEDDING_ITEMS: ComparisonEmbeddingItem[] = [
  {
    id: 'w2v-she',
    label: 'she',
    word: 'she',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [0.85, 0.56, -0.41, 0.15, -0.12, -0.25, 0.52, 0.65],
    note: 'Sentence 1 pronoun associated with the financial transaction context.',
  },
  {
    id: 'w2v-deposited',
    label: 'deposited',
    word: 'deposited',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [-0.25, 0.89, -0.62, 0.92, 0.35, -0.15, -0.42, -0.28],
    note: 'Financial action verb clustered near money.',
  },
  {
    id: 'w2v-money',
    label: 'money',
    word: 'money',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [-0.18, 0.94, -0.68, -0.35, -0.22, 0.88, 0.34, -0.45],
    note: 'Strongly aligned with the Finance dimension.',
  },
  {
    id: 'w2v-bank-shared',
    label: 'bank (both uses)',
    word: 'bank',
    sentence: 'Both: "in the bank" & "on the bank of the river"',
    group: 'target',
    colorHex: '#FFD43B',
    vector: [...STATIC_BANK_VECTOR],
    note: 'Static Word2Vec assigns ONE identical vector to "bank" in both sentences.',
  },
  {
    id: 'w2v-fisherman',
    label: 'fisherman',
    word: 'fisherman',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [0.84, -0.63, 0.76, 0.14, -0.42, -0.18, 0.61, 0.42],
    note: 'Sentence 2 subject clustered near river and nature words.',
  },
  {
    id: 'w2v-sat',
    label: 'sat',
    word: 'sat',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [0.16, -0.48, 0.58, 0.88, 0.25, -0.31, -0.46, 0.22],
    note: 'Sentence 2 verb grounded in the riverside scene.',
  },
  {
    id: 'w2v-river',
    label: 'river',
    word: 'river',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [-0.48, -0.74, 0.94, -0.32, -0.49, 0.55, -0.18, -0.51],
    note: 'Strongly aligned with the Nature / Water dimension.',
  },
];

// Contextual (BERT): "bank" gets two distinct vectors shaped by surrounding words.
export const BERT_EMBEDDING_ITEMS: ComparisonEmbeddingItem[] = [
  {
    id: 'bert-she',
    label: 'she',
    word: 'she',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [0.82, 0.64, -0.48, 0.17, -0.08, -0.22, 0.55, 0.61],
    note: 'Contextualized by Sentence 1 financial transaction.',
  },
  {
    id: 'bert-deposited',
    label: 'deposited',
    word: 'deposited',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [-0.22, 0.91, -0.66, 0.94, 0.31, -0.14, -0.39, -0.25],
    note: 'Strong finance and action signal.',
  },
  {
    id: 'bert-money',
    label: 'money',
    word: 'money',
    sentence: 'She deposited money in the bank.',
    group: 'finance',
    colorHex: '#2563EB',
    vector: [-0.15, 0.95, -0.71, -0.36, -0.21, 0.91, 0.37, -0.47],
    note: 'Core financial concept in Sentence 1.',
  },
  {
    id: 'bert-bank-finance',
    label: 'bank (financial)',
    word: 'bank',
    sentence: 'She deposited money in the bank.',
    group: 'target',
    colorHex: '#FFD43B',
    vector: [0.22, 0.88, -0.64, 0.32, 0.46, 0.45, -0.28, 0.25],
    note: 'Contextual BERT vector pulled toward "deposited" and "money".',
  },
  {
    id: 'bert-fisherman',
    label: 'fisherman',
    word: 'fisherman',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [0.81, -0.66, 0.79, 0.16, -0.44, -0.19, 0.64, 0.39],
    note: 'Contextualized by Sentence 2 riverside scene.',
  },
  {
    id: 'bert-sat',
    label: 'sat',
    word: 'sat',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [0.14, -0.52, 0.62, 0.89, 0.27, -0.33, -0.44, 0.21],
    note: 'Action grounded near the river edge.',
  },
  {
    id: 'bert-river',
    label: 'river',
    word: 'river',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'river',
    colorHex: '#F97316',
    vector: [-0.46, -0.76, 0.95, -0.34, -0.51, 0.57, -0.19, -0.49],
    note: 'Core nature/water concept in Sentence 2.',
  },
  {
    id: 'bert-bank-river',
    label: 'bank (river)',
    word: 'bank',
    sentence: 'The fisherman sat on the bank of the river.',
    group: 'target',
    colorHex: '#FFD43B',
    vector: [-0.18, -0.71, 0.89, 0.22, 0.36, -0.21, 0.42, -0.06],
    note: 'Contextual BERT vector pulled toward "fisherman" and "river".',
  },
];
