import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialVocabularyState,
  addVocabularyWord,
  removeVocabularyWord,
  clearVocabulary,
  restoreStarterVocabulary,
} from './vocabulary';
import { getCharacterId, mapTextToCharacterIds } from './characterIds';
import { tokenizeText } from './tokenizer';
import {
  getIllustrativeEmbedding,
  WORD2VEC_EMBEDDING_ITEMS,
  BERT_EMBEDDING_ITEMS,
  cosineSimilarity,
  getNearestNeighbors,
} from './embeddings';
import { projectEmbeddingsTo3D } from './pca';

test('Vocabulary builder initializes with 8 starter words and maintains monotonic IDs', () => {
  let state = createInitialVocabularyState();
  assert.equal(state.entries.length, 8);
  assert.equal(state.entries[0].word, 'CAT');
  assert.equal(state.entries[0].id, 1);
  assert.equal(state.entries[7].word, 'AI');
  assert.equal(state.entries[7].id, 8);

  // Duplicate prevention (case-insensitive)
  const dup = addVocabularyWord(state, 'cat');
  assert.ok(dup.error);
  assert.equal(dup.state.entries.length, 8);

  // Adding a new word assigns next available ID (9)
  const added = addVocabularyWord(state, 'Transformer');
  assert.equal(added.error, null);
  assert.equal(added.addedEntry?.word, 'TRANSFORMER');
  assert.equal(added.addedEntry?.id, 9);
  state = added.state;

  // Deleting APPLE (ID 3) keeps BANK at ID 5 and next word gets ID 10
  state = removeVocabularyWord(state, 3);
  assert.equal(state.entries.find((e) => e.word === 'BANK')?.id, 5);

  const added2 = addVocabularyWord(state, 'Vector');
  assert.equal(added2.addedEntry?.id, 10);

  // Clear vocabulary empties list but keeps nextId consistent
  const cleared = clearVocabulary(added2.state);
  assert.equal(cleared.entries.length, 0);
  const afterClear = addVocabularyWord(cleared, 'Token');
  assert.equal(afterClear.addedEntry?.id, 11);

  const restored = restoreStarterVocabulary(afterClear.state);
  assert.equal(restored.entries.length, 9);
});

test('Character ID explorer matches HELLO example and handles all character types consistently', () => {
  const hello = mapTextToCharacterIds('HELLO');
  assert.deepEqual(
    hello.map((c) => c.id),
    [8, 5, 12, 12, 15],
  );
  // Repeated L gets identical ID
  assert.equal(hello[2].id, hello[3].id);

  // Uppercase, lowercase, space, number, punctuation all get distinct consistent IDs
  const mixed = mapTextToCharacterIds('Aa 9!');
  const ids = mixed.map((c) => c.id);
  assert.equal(new Set(ids).size, 5);
  assert.equal(getCharacterId('a'), mixed[1].id);
  assert.notEqual(getCharacterId('A'), getCharacterId('a'));
});

test('Real BPE tokenizer tokenizes sentences into words, subwords, and punctuation and links vocabulary', () => {
  const vocab = createInitialVocabularyState().entries;
  const tokens = tokenizeText('The cat is sitting on the mat.', vocab);
  assert.ok(tokens.length >= 7);

  // " cat" should match CAT (ID 1) in vocabulary
  const catToken = tokens.find((t) => t.text.trim().toLowerCase() === 'cat');
  assert.ok(catToken);
  assert.equal(catToken.vocabMatch?.word, 'CAT');
  assert.equal(catToken.vocabMatch?.id, 1);

  // Subword / multi-token word check (real BPE splits uncommon words or preserves punctuation)
  const aiTokens = tokenizeText('Artificial Intelligence!', vocab);
  assert.ok(aiTokens.some((t) => t.category === 'punctuation'));
});

test('Illustrative embeddings and PCA 3D projection separate contextual BERT bank uses while keeping Word2Vec static', () => {
  const catVec = getIllustrativeEmbedding('CAT');
  assert.equal(catVec.length, 8);
  assert.deepEqual(catVec.slice(0, 4), [0.24, -0.61, 0.83, 0.17]);

  // Custom word gets deterministic 8D vector
  const custom1 = getIllustrativeEmbedding('NEURAL');
  const custom2 = getIllustrativeEmbedding('neural');
  assert.deepEqual(custom1, custom2);
  assert.equal(custom1.length, 8);

  // PCA projection for Word2Vec has a single shared "bank" point
  const w2vPca = projectEmbeddingsTo3D(WORD2VEC_EMBEDDING_ITEMS);
  assert.equal(w2vPca.points.length, WORD2VEC_EMBEDDING_ITEMS.length);
  const w2vBanks = w2vPca.points.filter((p) => p.word === 'bank');
  assert.equal(w2vBanks.length, 1);

  // PCA projection for BERT has two distinct "bank" locations, closer to their respective contexts
  const bertPca = projectEmbeddingsTo3D(BERT_EMBEDDING_ITEMS);
  const bankFinance = bertPca.points.find((p) => p.id === 'bert-bank-finance')!;
  const bankRiver = bertPca.points.find((p) => p.id === 'bert-bank-river')!;
  const money = bertPca.points.find((p) => p.id === 'bert-money')!;
  const river = bertPca.points.find((p) => p.id === 'bert-river')!;

  const dist = (a: [number, number, number], b: [number, number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  assert.ok(dist(bankFinance.coords3D, bankRiver.coords3D) > 1.0);
  assert.ok(dist(bankFinance.coords3D, money.coords3D) < dist(bankFinance.coords3D, river.coords3D));
  assert.ok(dist(bankRiver.coords3D, river.coords3D) < dist(bankRiver.coords3D, money.coords3D));
});

test('Cosine similarity and nearest neighbors accurately reflect contextual clusters', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);

  const bertFinanceBank = BERT_EMBEDDING_ITEMS.find((p) => p.id === 'bert-bank-finance')!;
  const bertRiverBank = BERT_EMBEDDING_ITEMS.find((p) => p.id === 'bert-bank-river')!;

  const financeNeighbors = getNearestNeighbors(bertFinanceBank, BERT_EMBEDDING_ITEMS, 3);
  const riverNeighbors = getNearestNeighbors(bertRiverBank, BERT_EMBEDDING_ITEMS, 3);

  assert.ok(financeNeighbors.every((n) => n.item.group === 'finance'));
  assert.ok(riverNeighbors.every((n) => n.item.group === 'river'));
});

