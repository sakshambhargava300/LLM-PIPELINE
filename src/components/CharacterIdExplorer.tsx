import { useState, useEffect, useMemo } from 'react';
import { mapTextToCharacterIds } from '../utils/characterIds';

interface CharacterIdExplorerProps {
  syncedText: string;
}

export function CharacterIdExplorer({ syncedText }: CharacterIdExplorerProps) {
  const [charText, setCharText] = useState(syncedText);

  useEffect(() => {
    setCharText(syncedText);
  }, [syncedText]);

  const charItems = useMemo(() => mapTextToCharacterIds(charText), [charText]);

  return (
    <section
      id="character-ids"
      aria-labelledby="char-id-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
            Stage 3
          </p>
          <h2
            id="char-id-heading"
            className="text-2xl font-bold tracking-tight text-[#111111]"
          >
            CHARACTER ID EXPLORER
          </h2>
          <p className="text-base text-gray-600 mt-1">
            Computers cannot read letters directly. Every character—uppercase, lowercase, spaces,
            numbers, and punctuation—can be mapped to a consistent numerical ID.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs font-medium text-gray-500">Total Character Count</div>
          <div
            data-testid="char-count"
            className="text-2xl font-bold text-[#111111] tabular-nums"
          >
            {charItems.length}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="char-explorer-input"
              className="block text-sm font-semibold text-[#111111] mb-1.5"
            >
              Test any text character by character
            </label>
            <input
              id="char-explorer-input"
              type="text"
              value={charText}
              onChange={(e) => setCharText(e.target.value)}
              placeholder="Type text such as HELLO or Chat-42!"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm font-mono text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-[#111111]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCharText('HELLO')}
              className="px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-[#111111] transition-colors whitespace-nowrap cursor-pointer"
            >
              Try &ldquo;HELLO&rdquo;
            </button>
            <button
              type="button"
              onClick={() => setCharText('Hello AI 2026!')}
              className="px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-[#111111] transition-colors whitespace-nowrap cursor-pointer"
            >
              Try &ldquo;Hello AI 2026!&rdquo;
            </button>
          </div>
        </div>

        {charItems.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
            Enter characters above to inspect their aligned character IDs.
          </div>
        ) : (
          <div
            data-testid="char-grid"
            className="flex flex-wrap gap-2"
            aria-label="Aligned character and ID boxes"
          >
            {charItems.map((item) => (
              <div
                key={`${item.index}-${item.id}`}
                className="flex flex-col items-center border border-gray-200 rounded-lg overflow-hidden min-w-[3.25rem] bg-white"
              >
                <div
                  className={`w-full px-2.5 py-2 text-center font-mono text-sm font-bold border-b border-gray-200 ${
                    item.category === 'Space'
                      ? 'bg-gray-100 text-gray-600 text-[11px]'
                      : 'bg-[#FFF9DB] text-[#111111]'
                  }`}
                >
                  {item.displayChar}
                </div>
                <div className="w-full px-2 py-1.5 text-center font-mono text-xs font-semibold text-[#111111] tabular-nums bg-white">
                  {item.id}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>
            <strong>Note:</strong> These numbers (for example,{' '}
            <span className="font-mono">HELLO → 8, 5, 12, 12, 15</span>) are{' '}
            <strong>illustrative character IDs</strong> where repeated characters always receive the
            same ID. Real LLMs group characters into larger subword units called{' '}
            <strong>tokens</strong> (see Stage 4).
          </p>
          <span className="text-xs text-gray-500 shrink-0 font-mono">
            A–Z: 1–26 · a–z: 27–52 · 0–9: 53–62 · Space: 63
          </span>
        </div>
      </div>
    </section>
  );
}
