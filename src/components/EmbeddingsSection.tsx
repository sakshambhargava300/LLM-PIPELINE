import { useMemo } from 'react';
import {
  EMBEDDING_DIMENSIONS,
  formatVectorPreview,
  getIllustrativeEmbedding,
} from '../utils/embeddings';
import type { TokenItem } from '../utils/tokenizer';
import { findVocabularyEntry, type VocabularyEntry } from '../utils/vocabulary';

interface EmbeddingsSectionProps {
  vocabulary: VocabularyEntry[];
  tokens: TokenItem[];
  selectedWord: string;
  onSelectWord: (word: string) => void;
}

export function EmbeddingsSection({
  vocabulary,
  tokens,
  selectedWord,
  onSelectWord,
}: EmbeddingsSectionProps) {
  const uniqueTokens = useMemo(() => {
    const seen = new Set<string>();
    const list: { label: string; tokenId: number }[] = [];
    for (const token of tokens) {
      const cleaned = token.text.trim();
      if (!cleaned) continue;
      const key = cleaned.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ label: cleaned, tokenId: token.id });
      }
    }
    return list;
  }, [tokens]);

  const activeWord = selectedWord.trim() || 'CAT';
  const vector = useMemo(() => getIllustrativeEmbedding(activeWord), [activeWord]);
  const vocabEntry = useMemo(
    () => findVocabularyEntry(vocabulary, activeWord),
    [vocabulary, activeWord],
  );

  return (
    <section
      id="embeddings"
      aria-labelledby="embeddings-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="pb-5 border-b border-gray-200">
        <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
          Stage 5
        </p>
        <h2
          id="embeddings-heading"
          className="text-2xl font-bold tracking-tight text-[#111111]"
        >
          EMBEDDINGS
        </h2>
        <p className="text-base text-gray-600 mt-1">
          Token IDs and Vocabulary IDs are just labels. An <strong>embedding</strong> converts each
          token into a list of numbers (a mathematical vector) so the model can measure similarity
          and meaning—for example,{' '}
          <span className="inline-block whitespace-nowrap font-mono text-sm bg-[#FFF9DB] px-1.5 py-0.5 rounded border border-[#FFE066]">
            CAT → [0.24, -0.61, 0.83, 0.17, ...]
          </span>
          .
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-2">
              Select a token from your processed sentence
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueTokens.map((item) => {
                const isActive =
                  item.label.toUpperCase() === activeWord.toUpperCase();
                return (
                  <button
                    key={`${item.label}-${item.tokenId}`}
                    type="button"
                    onClick={() => onSelectWord(item.label)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#FFD43B] border-[#111111] text-[#111111] font-bold'
                        : 'bg-white border-gray-300 hover:border-[#111111] text-[#111111]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#111111] mb-2">
              Or select a word from your Vocabulary (Stage 1)
            </h3>
            {vocabulary.length === 0 ? (
              <p className="text-sm text-gray-500">
                No words in your custom vocabulary yet. Add words in Stage 1 to inspect them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vocabulary.map((entry) => {
                  const isActive = entry.word === activeWord.toUpperCase();
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onSelectWord(entry.word)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#FFD43B] border-[#111111] text-[#111111] font-bold'
                          : 'bg-gray-50 border-gray-300 hover:border-[#111111] text-[#111111]'
                      }`}
                    >
                      {entry.word} <span className="text-gray-500">#{entry.id}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-gray-200">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                Illustrative Embedding Vector (8 Dimensions)
              </span>
              <h3
                data-testid="selected-embedding-word"
                className="text-xl font-bold font-mono text-[#111111] mt-0.5"
              >
                {activeWord.toUpperCase()}
              </h3>
            </div>

            <div className="text-xs text-gray-600 font-mono">
              {vocabEntry ? `Vocabulary ID: ${vocabEntry.id}` : 'Not in custom vocabulary'}
            </div>
          </div>

          <div
            data-testid="embedding-vector-preview"
            className="p-3.5 rounded-lg bg-white border border-gray-200 font-mono text-sm text-[#111111] overflow-x-auto"
          >
            {activeWord.toUpperCase()} → {formatVectorPreview(vector, 8).replace(', ...]', ']')}
          </div>

          <div className="space-y-2.5">
            {EMBEDDING_DIMENSIONS.map((dimName, idx) => {
              const val = vector[idx];
              const pct = Math.min(100, Math.round(Math.abs(val) * 100));
              const isPositive = val >= 0;

              return (
                <div key={dimName} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <span className="col-span-3 sm:col-span-2 font-medium text-gray-700 truncate">
                    {dimName}
                  </span>
                  <div className="col-span-7 sm:col-span-8 h-3 bg-white border border-gray-200 rounded-sm overflow-hidden flex items-center">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isPositive ? 'bg-[#FFD43B]' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="col-span-2 font-mono font-semibold text-right tabular-nums text-[#111111]">
                    {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-600 pt-1">
            <strong>Illustrative Vector Notice:</strong> Real LLMs learn hundreds or thousands of
            dimensions (e.g. 768 or 4096 numbers per token). The 8-dimensional vectors shown here
            are illustrative examples designed to demonstrate how coordinates encode meaning.
          </p>
        </div>
      </div>
    </section>
  );
}
