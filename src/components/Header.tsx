export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-base sm:text-lg font-bold tracking-tight text-[#111111] whitespace-nowrap shrink-0"
        >
          LLM PIPELINE EXPLORER
        </a>

        <nav
          aria-label="Pipeline stages"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600"
        >
          <a
            href="#vocabulary"
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Vocabulary
          </a>
          <a
            href="#character-ids"
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Characters
          </a>
          <a
            href="#tokenizer"
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Tokenizer
          </a>
          <a
            href="#embeddings"
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Embeddings
          </a>
          <a
            href="#static-vs-contextual"
            className="hover:text-[#111111] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Graph
          </a>
        </nav>

        <div className="shrink-0">
          <a
            href="#vocabulary"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#FFD43B] hover:bg-[#FCC419] text-[#111111] text-sm font-semibold border border-[#E5B800] transition-colors whitespace-nowrap shrink-0"
          >
            Start Exploring
          </a>
        </div>
      </div>
    </header>
  );
}
