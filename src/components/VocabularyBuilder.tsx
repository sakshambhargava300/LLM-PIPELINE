import { useState, type FormEvent } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import type { VocabularyEntry } from '../utils/vocabulary';

interface VocabularyBuilderProps {
  entries: VocabularyEntry[];
  onAddWord: (word: string) => string | null;
  onRemoveWord: (id: number) => void;
  onClearVocabulary: () => void;
  onRestoreStarter: () => void;
}

export function VocabularyBuilder({
  entries,
  onAddWord,
  onRemoveWord,
  onClearVocabulary,
  onRestoreStarter,
}: VocabularyBuilderProps) {
  const [wordInput, setWordInput] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const error = onAddWord(wordInput);
    if (error) {
      setFeedback({ type: 'error', message: error });
      return;
    }
    const addedWord = wordInput.trim().toUpperCase();
    setWordInput('');
    setFeedback({
      type: 'success',
      message: `Added "${addedWord}" to your vocabulary.`,
    });
  };

  return (
    <section
      id="vocabulary"
      aria-labelledby="vocab-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
            Stage 1
          </p>
          <h2
            id="vocab-heading"
            className="text-2xl font-bold tracking-tight text-[#111111]"
          >
            BUILD YOUR VOCABULARY
          </h2>
          <p className="text-base text-gray-600 mt-1">
            Create a collection of words that the language model can learn to represent.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs font-medium text-gray-500">Total Vocabulary Size</div>
          <div
            data-testid="vocab-size"
            className="text-2xl font-bold text-[#111111] tabular-nums"
          >
            {entries.length} {entries.length === 1 ? 'word' : 'words'}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="vocab-word-input"
              className="block text-sm font-semibold text-[#111111]"
            >
              Add a word to the vocabulary
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="vocab-word-input"
                type="text"
                value={wordInput}
                onChange={(e) => {
                  setWordInput(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="e.g. NEURAL"
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-[#111111]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#FFD43B] hover:bg-[#FCC419] text-[#111111] text-sm font-semibold border border-[#E5B800] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                ADD TO VOCABULARY
              </button>
            </div>
            {feedback && (
              <p
                role="status"
                className={`text-sm font-medium ${
                  feedback.type === 'error' ? 'text-red-700' : 'text-gray-700'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                onClearVocabulary();
                setFeedback({
                  type: 'success',
                  message: 'Vocabulary cleared. New words will continue using the next available ID.',
                });
              }}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-[#111111] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              CLEAR VOCABULARY
            </button>

            <button
              type="button"
              onClick={() => {
                onRestoreStarter();
                setFeedback({
                  type: 'success',
                  message: 'Restored any missing starter sample words.',
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Restore Starter Words
            </button>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 space-y-1.5">
            <p className="font-semibold text-[#111111]">
              Vocabulary IDs are identifiers, not embedding vectors
            </p>
            <p className="leading-relaxed">
              A Vocabulary ID (like <span className="font-mono font-medium">CAT = 1</span> or{' '}
              <span className="font-mono font-medium">BANK = 5</span>) is simply an index label so
              the system can look up a word consistently. It carries no meaning by itself—meaning is
              learned later in the <strong>Embeddings</strong> stage.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {entries.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-sm font-medium text-gray-700">
                Your vocabulary is currently empty.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Add a word using the input box or click Restore Starter Words.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Word
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Vocabulary ID
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#111111]">
                        {entry.word}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-gray-800">
                        {entry.id}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveWord(entry.id);
                            setFeedback({
                              type: 'success',
                              message: `Removed "${entry.word}" (ID ${entry.id}). Remaining IDs stay unchanged.`,
                            });
                          }}
                          aria-label={`Delete ${entry.word}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
