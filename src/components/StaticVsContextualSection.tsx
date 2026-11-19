import { useMemo, useState } from 'react';
import {
  BERT_EMBEDDING_ITEMS,
  WORD2VEC_EMBEDDING_ITEMS,
  formatVectorPreview,
} from '../utils/embeddings';
import { projectEmbeddingsTo3D } from '../utils/pca';
import { ScatterPlot3D } from './ScatterPlot3D';

function HighlightedBankSentence({
  index,
  prefix,
  suffix,
}: {
  index: number;
  prefix: string;
  suffix: string;
}) {
  return (
    <p className="text-sm text-[#111111] leading-relaxed">
      <span className="font-mono text-xs text-gray-500 mr-1.5">{index}.</span>
      {prefix}
      <mark className="px-1.5 py-0.5 rounded bg-[#FFD43B] text-[#111111] font-bold">
        bank
      </mark>
      {suffix}
    </p>
  );
}

export function StaticVsContextualSection() {
  const w2vPca = useMemo(() => projectEmbeddingsTo3D(WORD2VEC_EMBEDDING_ITEMS), []);
  const bertPca = useMemo(() => projectEmbeddingsTo3D(BERT_EMBEDDING_ITEMS), []);

  const [selectedW2vId, setSelectedW2vId] = useState<string>('w2v-bank-shared');
  const [selectedBertId, setSelectedBertId] = useState<string>('bert-bank-finance');

  const selectedW2vPoint = useMemo(
    () => w2vPca.points.find((p) => p.id === selectedW2vId) ?? w2vPca.points[0],
    [w2vPca.points, selectedW2vId],
  );

  const selectedBertPoint = useMemo(
    () => bertPca.points.find((p) => p.id === selectedBertId) ?? bertPca.points[0],
    [bertPca.points, selectedBertId],
  );

  const w2vBankPoint = w2vPca.points.find((p) => p.id === 'w2v-bank-shared')!;
  const bertFinanceBank = bertPca.points.find((p) => p.id === 'bert-bank-finance')!;
  const bertRiverBank = bertPca.points.find((p) => p.id === 'bert-bank-river')!;

  return (
    <section
      id="static-vs-contextual"
      aria-labelledby="static-contextual-heading"
      className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-8"
    >
      <div className="pb-5 border-b border-gray-200">
        <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1">
          Stages 6 &amp; 7
        </p>
        <h2
          id="static-contextual-heading"
          className="text-2xl font-bold tracking-tight text-[#111111]"
        >
          STATIC VS CONTEXTUAL EMBEDDINGS &amp; 3D COMPARISON
        </h2>
        <p className="text-base text-gray-600 mt-1">
          The word <strong className="text-[#111111]">bank</strong> has two completely different
          meanings below. Compare how older static models (Word2Vec) and modern contextual models
          (BERT) represent them in 3D space.
        </p>
      </div>

      {/* Stage 6: Side-by-side conceptual comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="pb-3 border-b border-gray-200">
            <h3 className="text-lg font-bold text-[#111111]">
              Static Embeddings (Word2Vec)
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              One fixed vector per word—context is ignored.
            </p>
          </div>

          <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-3.5">
            <HighlightedBankSentence
              index={1}
              prefix="She deposited money in the "
              suffix="."
            />
            <HighlightedBankSentence
              index={2}
              prefix="The fisherman sat on the "
              suffix=" of the river."
            />
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="block text-gray-500 mb-0.5">Sentence 1 &ldquo;bank&rdquo;:</span>
              <span className="text-[#111111] font-semibold">
                {formatVectorPreview(w2vBankPoint.vector)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="block text-gray-500 mb-0.5">Sentence 2 &ldquo;bank&rdquo;:</span>
              <span className="text-[#111111] font-semibold">
                {formatVectorPreview(w2vBankPoint.vector)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            Both occurrences of <strong>bank</strong> share the exact same vector and sit at the
            exact same 3D coordinate{' '}
            <span className="font-mono text-xs tabular-nums">
              ({w2vBankPoint.coords3D.join(', ')})
            </span>
            .
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="pb-3 border-b border-gray-200">
            <h3 className="text-lg font-bold text-[#111111]">
              Contextual Embeddings (BERT)
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Surrounding words reshape the vector for each meaning.
            </p>
          </div>

          <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-3.5">
            <HighlightedBankSentence
              index={1}
              prefix="She deposited money in the "
              suffix="."
            />
            <HighlightedBankSentence
              index={2}
              prefix="The fisherman sat on the "
              suffix=" of the river."
            />
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="block text-blue-700 font-semibold mb-0.5">
                Financial &ldquo;bank&rdquo; (near deposited, money):
              </span>
              <span className="text-[#111111] font-semibold">
                {formatVectorPreview(bertFinanceBank.vector)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="block text-orange-700 font-semibold mb-0.5">
                River &ldquo;bank&rdquo; (near fisherman, river):
              </span>
              <span className="text-[#111111] font-semibold">
                {formatVectorPreview(bertRiverBank.vector)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            Because BERT reads surrounding words, Financial <strong>bank</strong> and River{' '}
            <strong>bank</strong> get different vectors and separate cleanly in the 3D graph.
          </p>
        </div>
      </div>

      {/* Color Legend for 3D Plots */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700">
        <div className="font-semibold text-[#111111]">
          3D Projection Legend (PCA from 8D → 3D):
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full bg-[#FFD43B] border border-black/25"
            />
            <span>
              Target word (<strong>bank</strong>)
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full bg-[#2563EB] border border-black/25"
            />
            <span>Sentence 1 financial context (she, deposited, money)</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full bg-[#F97316] border border-black/25"
            />
            <span>Sentence 2 river context (fisherman, sat, river)</span>
          </span>
        </div>
      </div>

      {/* Stage 7: Side-by-side Interactive 3D Graphs + Selected Vector Inspectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <ScatterPlot3D
            title="Word2Vec (Static) — 3D Projection"
            subtitle='Single shared location for "bank" across both sentences'
            points={w2vPca.points}
            varianceExplained={w2vPca.varianceExplained}
            selectedPointId={selectedW2vPoint.id}
            onSelectPoint={setSelectedW2vId}
            testId="w2v-3d-canvas"
          />

          <div
            data-testid="w2v-vector-inspector"
            className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold text-[#111111] font-mono">
                Selected: {selectedW2vPoint.label}
              </span>
              <span className="text-xs font-mono text-gray-600 tabular-nums">
                3D PCA: ({selectedW2vPoint.coords3D.join(', ')})
              </span>
            </div>
            <p className="text-xs text-gray-600">{selectedW2vPoint.note}</p>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200 font-mono text-xs text-[#111111] overflow-x-auto tabular-nums">
              [{selectedW2vPoint.vector.map((v) => v.toFixed(2)).join(', ')}]
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ScatterPlot3D
            title="BERT (Contextual) — 3D Projection"
            subtitle='Two distinct locations for "bank" based on sentence context'
            points={bertPca.points}
            varianceExplained={bertPca.varianceExplained}
            selectedPointId={selectedBertPoint.id}
            onSelectPoint={setSelectedBertId}
            testId="bert-3d-canvas"
          />

          <div
            data-testid="bert-vector-inspector"
            className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold text-[#111111] font-mono">
                Selected: {selectedBertPoint.label}
              </span>
              <span className="text-xs font-mono text-gray-600 tabular-nums">
                3D PCA: ({selectedBertPoint.coords3D.join(', ')})
              </span>
            </div>
            <p className="text-xs text-gray-600">{selectedBertPoint.note}</p>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200 font-mono text-xs text-[#111111] overflow-x-auto tabular-nums">
              [{selectedBertPoint.vector.map((v) => v.toFixed(2)).join(', ')}]
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div id="comparison-table" className="pt-2">
        <h3 className="text-lg font-bold text-[#111111] mb-3">
          Word2Vec vs BERT Comparison
        </h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Feature
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Word2Vec
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  BERT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Embedding</td>
                <td className="px-4 py-3 text-gray-700">Static</td>
                <td className="px-4 py-3 text-gray-700">Contextual</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Context awareness</td>
                <td className="px-4 py-3 text-gray-700">No</td>
                <td className="px-4 py-3 text-gray-700">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Same word</td>
                <td className="px-4 py-3 text-gray-700">Same vector</td>
                <td className="px-4 py-3 text-gray-700">
                  Different vectors depending on context
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Example</td>
                <td className="px-4 py-3 text-gray-700">Word2Vec</td>
                <td className="px-4 py-3 text-gray-700">BERT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
