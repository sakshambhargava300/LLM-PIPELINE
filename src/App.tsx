import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { TextInputSection } from './components/TextInputSection';
import { CharacterIdExplorer } from './components/CharacterIdExplorer';
import { TokenizerSection } from './components/TokenizerSection';
import { EmbeddingsSection } from './components/EmbeddingsSection';
import { StaticVsContextualSection } from './components/StaticVsContextualSection';
import {
  addVocabularyWord,
  clearVocabulary,
  createInitialVocabularyState,
  removeVocabularyWord,
  restoreStarterVocabulary,
} from './utils/vocabulary';
import { tokenizeText } from './utils/tokenizer';
import { SAMPLE_SENTENCES } from './utils/embeddings';

const PIPELINE_STEPS = [
  { id: 'vocabulary', num: '1', label: 'Build Vocabulary' },
  { id: 'text-input', num: '2', label: 'Enter Text' },
  { id: 'character-ids', num: '3', label: 'Character IDs' },
  { id: 'tokenizer', num: '4', label: 'Tokenizer' },
  { id: 'embeddings', num: '5', label: 'Embeddings' },
  { id: 'static-vs-contextual', num: '6–7', label: '3D Comparison' },
] as const;

export default function App() {
  const [vocabState, setVocabState] = useState(() => createInitialVocabularyState());
  const [processedText, setProcessedText] = useState<string>(SAMPLE_SENTENCES[0]);
  const [selectedEmbeddingWord, setSelectedEmbeddingWord] = useState<string>('CAT');

  const tokens = useMemo(
    () => tokenizeText(processedText, vocabState.entries),
    [processedText, vocabState.entries],
  );

  const handleAddVocabularyWord = (word: string): string | null => {
    const result = addVocabularyWord(vocabState, word);
    if (result.error) {
      return result.error;
    }
    setVocabState(result.state);
    if (result.addedEntry) {
      setSelectedEmbeddingWord(result.addedEntry.word);
    }
    return null;
  };

  const handleRemoveVocabularyWord = (id: number) => {
    setVocabState((prev) => removeVocabularyWord(prev, id));
  };

  const handleClearVocabulary = () => {
    setVocabState((prev) => clearVocabulary(prev));
  };

  const handleRestoreStarterVocabulary = () => {
    setVocabState((prev) => restoreStarterVocabulary(prev));
  };

  const handleProcessText = (newText: string) => {
    setProcessedText(newText);
    const nextTokens = tokenizeText(newText, vocabState.entries);
    const firstWordToken = nextTokens.find((t) => /[a-zA-Z0-9]/.test(t.text));
    if (firstWordToken) {
      setSelectedEmbeddingWord(firstWordToken.text.trim());
    }
  };

  return (
    <div id="top" className="min-h-screen bg-white text-[#111111]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Intro / Homepage Hero */}
        <section aria-labelledby="hero-heading" className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] text-balance"
            >
              How Large Language Models Read Text
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Explore the core stages of an LLM text pipeline—from building a word vocabulary and
              assigning character IDs, to splitting sentences with a real BPE tokenizer and
              projecting static vs. contextual embedding vectors into interactive 3D space.
            </p>
          </div>

          <div
            aria-label="Pipeline sequence"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1"
          >
            {PIPELINE_STEPS.map((step) => (
              <a
                key={step.id}
                href={`#${step.id}`}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#111111] transition-colors"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#FFD43B] text-[#111111] font-mono text-xs font-bold shrink-0">
                  {step.num}
                </span>
                <span className="text-xs font-semibold text-[#111111] truncate">
                  {step.label}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* 1. Build Vocabulary */}
        <VocabularyBuilder
          entries={vocabState.entries}
          onAddWord={handleAddVocabularyWord}
          onRemoveWord={handleRemoveVocabularyWord}
          onClearVocabulary={handleClearVocabulary}
          onRestoreStarter={handleRestoreStarterVocabulary}
        />

        {/* 2. Enter Text */}
        <TextInputSection
          processedText={processedText}
          onProcessText={handleProcessText}
        />

        {/* 3. Character ID Explorer */}
        <CharacterIdExplorer syncedText={processedText} />

        {/* 4. Tokenizer */}
        <TokenizerSection
          processedText={processedText}
          tokens={tokens}
          selectedTokenText={selectedEmbeddingWord}
          onSelectToken={setSelectedEmbeddingWord}
        />

        {/* 5. Embeddings */}
        <EmbeddingsSection
          vocabulary={vocabState.entries}
          tokens={tokens}
          selectedWord={selectedEmbeddingWord}
          onSelectWord={setSelectedEmbeddingWord}
        />

        {/* 6 & 7. Static vs Contextual Embeddings + 3D Comparison + Comparison Table */}
        <StaticVsContextualSection />
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>LLM Pipeline Explorer · Interactive Educational Guide</span>
          <span>Character IDs &amp; 8D Embeddings are illustrative · BPE uses cl100k_base</span>
        </div>
      </footer>
    </div>
  );
}
