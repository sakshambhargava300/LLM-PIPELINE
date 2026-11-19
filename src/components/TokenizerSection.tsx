import type { TokenItem } from '../utils/tokenizer';

interface TokenizerSectionProps {
  processedText: string;
  tokens: TokenItem[];
  selectedTokenText: string;
  onSelectToken: (tokenWord: string) => void;
}

export function TokenizerSection({
  processedText,
  tokens,
  selectedTokenText,
  onSelectToken,
}: TokenizerSectionProps) {
  const vocabMatchCount = tokens.filter((t) => t.vocabMatch !== null).length;

  return (
    <section
      id="tokenizer"
      aria-labelledby="tokenizer-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
            Stage 4
          </p>
          <h2
            id="tokenizer-heading"
            className="text-2xl font-bold tracking-tight text-[#111111]"
          >
            TOKENIZER
          </h2>
          <p className="text-base text-gray-600 mt-1">
            Instead of processing one letter at a time, Large Language Models use a{' '}
            <strong>BPE tokenizer</strong> (<span className="font-mono text-sm">cl100k_base</span>
            ) to split text into common words, subwords, and punctuation.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs font-medium text-gray-500">Total Tokens</div>
          <div
            data-testid="token-count"
            className="text-2xl font-bold text-[#111111] tabular-nums"
          >
            {tokens.length}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
          <div>
            Processed text:{' '}
            <span className="font-medium text-[#111111]">&ldquo;{processedText}&rdquo;</span>
          </div>
          <div className="text-xs text-gray-500 tabular-nums">
            Custom vocabulary matches: <strong className="text-[#111111]">{vocabMatchCount}</strong>{' '}
            of {tokens.length} tokens (click any token to inspect its embedding below)
          </div>
        </div>

        {tokens.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
            Enter a sentence in Stage 2 and click PROCESS TEXT to inspect its BPE tokens.
          </div>
        ) : (
          <div
            data-testid="token-list"
            className="flex flex-wrap gap-3"
            aria-label="Tokenized output"
          >
            {tokens.map((token) => {
              const normalizedToken = token.text.trim().toUpperCase();
              const isSelected =
                normalizedToken !== '' &&
                normalizedToken === selectedTokenText.trim().toUpperCase();

              return (
                <button
                  key={`${token.index}-${token.id}`}
                  type="button"
                  onClick={() => {
                    const target = token.text.trim() || token.displayText;
                    onSelectToken(target);
                  }}
                  className={`group flex flex-col items-stretch rounded-lg border transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'border-[#111111] ring-2 ring-[#FFD43B]'
                      : 'border-gray-300 hover:border-[#111111]'
                  }`}
                >
                  <span className="px-3.5 py-2 bg-[#FFD43B] text-[#111111] font-mono text-sm font-bold rounded-t-[7px] text-center whitespace-pre">
                    {token.displayText}
                  </span>
                  <span className="px-3 py-1.5 bg-white text-center border-t border-[#E5B800] rounded-b-[7px]">
                    <span className="block font-mono text-xs font-semibold text-[#111111] tabular-nums">
                      ID: {token.id}
                    </span>
                    <span className="block text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                      {token.vocabMatch
                        ? `Vocab #${token.vocabMatch.id}`
                        : token.category}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 space-y-1.5">
          <p className="font-semibold text-[#111111]">
            Why are tokens not always full words?
          </p>
          <p className="leading-relaxed">
            Tokens can be <strong>whole words</strong> (like{' '}
            <span className="font-mono">␣cat</span>), <strong>subwords</strong> (longer or rare
            words split into pieces), or <strong>punctuation</strong> (like{' '}
            <span className="font-mono">.</span>). Leading spaces are shown as{' '}
            <span className="font-mono">␣</span> because BPE tokenizers treat spaces as part of
            the token.
          </p>
        </div>
      </div>
    </section>
  );
}
