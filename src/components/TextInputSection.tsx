import { useState, useEffect, type FormEvent } from 'react';
import { SAMPLE_SENTENCES } from '../utils/embeddings';

interface TextInputSectionProps {
  processedText: string;
  onProcessText: (text: string) => void;
}

export function TextInputSection({
  processedText,
  onProcessText,
}: TextInputSectionProps) {
  const [draftText, setDraftText] = useState(processedText);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftText(processedText);
  }, [processedText]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draftText.trim()) {
      setError('Please enter or select a sentence before processing.');
      return;
    }
    setError(null);
    onProcessText(draftText);
  };

  const handleSelectSample = (sentence: string) => {
    setDraftText(sentence);
    setError(null);
    onProcessText(sentence);
  };

  return (
    <section
      id="text-input"
      aria-labelledby="text-input-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="pb-5 border-b border-gray-200">
        <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
          Stage 2
        </p>
        <h2
          id="text-input-heading"
          className="text-2xl font-bold tracking-tight text-[#111111]"
        >
          ENTER TEXT
        </h2>
        <p className="text-base text-gray-600 mt-1">
          Pick one of the sample sentences below or type your own sentence to trace how it moves
          through Character IDs, Tokenization, and Embeddings.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <span className="block text-sm font-semibold text-[#111111] mb-2.5">
            Sample Sentences
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SAMPLE_SENTENCES.map((sentence, idx) => {
              const isActive = processedText === sentence;
              return (
                <button
                  key={sentence}
                  type="button"
                  onClick={() => handleSelectSample(sentence)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FFD43B] border-[#E5B800] text-[#111111] font-semibold'
                      : 'bg-white border-gray-200 hover:border-gray-400 text-[#111111]'
                  }`}
                >
                  <span className="font-mono text-xs text-gray-600 mr-2 tabular-nums">
                    {idx + 1}.
                  </span>
                  {sentence}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="pipeline-text-input"
            className="block text-sm font-semibold text-[#111111]"
          >
            Your Sentence
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="pipeline-text-input"
              type="text"
              value={draftText}
              onChange={(e) => {
                setDraftText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter any sentence to process..."
              className="flex-1 min-w-0 px-4 py-3 rounded-lg border border-gray-300 text-base text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-[#111111]"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-[#FFD43B] hover:bg-[#FCC419] text-[#111111] text-sm font-bold border border-[#E5B800] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              PROCESS TEXT
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
