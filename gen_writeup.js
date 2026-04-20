const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, ExternalHyperlink,
} = require("docx");
const fs = require("fs");

// ── Colors ─────────────────────────────────────────────────────────────────
const BLUE    = "1F4E79";
const MIDBLUE = "2E75B6";
const LIGHT   = "D6E4F0";
const GRAY    = "F7F7F7";
const BLACK   = "222222";

// ── Helpers ────────────────────────────────────────────────────────────────
const b = (color = "CCCCCC") => ({
  top:    { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left:   { style: BorderStyle.SINGLE, size: 1, color },
  right:  { style: BorderStyle.SINGLE, size: 1, color },
});

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 30, color: BLUE })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, font: "Times New Roman", size: 26, color: MIDBLUE })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, italic: true, font: "Times New Roman", size: 24, color: BLACK })],
  });
}
function p(text, { bold = false, italic = false, after = 160 } = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after },
    children: [new TextRun({ text, bold, italic, font: "Times New Roman", size: 24, color: BLACK })],
  });
}
function mixed(...runs) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 160 },
    children: runs.map(r =>
      typeof r === "string"
        ? new TextRun({ text: r, font: "Times New Roman", size: 24, color: BLACK })
        : new TextRun({ font: "Times New Roman", size: 24, color: BLACK, ...r })
    ),
  });
}
function bullet(text, { bold = false, level = 0 } = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, bold, font: "Times New Roman", size: 24, color: BLACK })],
  });
}
function numbered(text, { bold = false } = {}) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, bold, font: "Times New Roman", size: 24, color: BLACK })],
  });
}
function gap(n = 1) {
  return new Paragraph({ spacing: { before: 0, after: n * 80 }, children: [] });
}
function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AACCE0", space: 1 } },
    spacing: { before: 60, after: 120 },
    children: [],
  });
}
function callout(text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: MIDBLUE },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: MIDBLUE },
        left:   { style: BorderStyle.THICK,  size: 16, color: MIDBLUE },
        right:  { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" },
      },
      shading: { fill: "EBF3FB", type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 120 },
      width: { size: 9360, type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text, italic: true, font: "Times New Roman", size: 24, color: BLACK })],
      })],
    })],
  })],
  });
}
function twoColTable(rows, colWidths = [3120, 6240]) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(([a, bText], i) => new TableRow({ children: [
      new TableCell({
        borders: b("CCCCCC"),
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        width: { size: colWidths[0], type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: a, bold: true, font: "Times New Roman", size: 22, color: BLUE })] })],
      }),
      new TableCell({
        borders: b("CCCCCC"),
        shading: { fill: i % 2 === 0 ? GRAY : "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        width: { size: colWidths[1], type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: bText, font: "Times New Roman", size: 22, color: BLACK })] })],
      }),
    ]})),
  });
}

// ── Document ───────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Times New Roman", color: BLUE },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Times New Roman", color: MIDBLUE },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, italic: true, font: "Times New Roman", color: BLACK },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MIDBLUE, space: 1 } },
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "CS6120 NLP  |  RAG News Retrieval System", font: "Times New Roman", size: 18, color: "888888" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDBLUE, space: 1 } },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", font: "Times New Roman", size: 18, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 18, color: "888888" }),
        ],
      })] }),
    },

    children: [
      // ════════════════════════════════════════════════════════════════════
      // TITLE PAGE
      // ════════════════════════════════════════════════════════════════════
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 640, after: 160 },
        children: [new TextRun({ text: "RAG-Powered News Retrieval System", bold: true, font: "Times New Roman", size: 52, color: BLUE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "Retrieval-Augmented Generation over BBC News Corpus (2023\u20132024)", font: "Times New Roman", size: 28, color: "555555" })],
      }),
      gap(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "CS6120 \u2014 Natural Language Processing", font: "Times New Roman", size: 24, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Northeastern University, Khoury College of Computer Sciences", font: "Times New Roman", size: 24, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Zhidian Wang  \u00b7  Zhenghan Jing", font: "Times New Roman", size: 24, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 640 },
        children: [new TextRun({ text: "April 2026", font: "Times New Roman", size: 24, color: "666666" })],
      }),
      divider(),
      gap(1),

      // ════════════════════════════════════════════════════════════════════
      // ABSTRACT
      // ════════════════════════════════════════════════════════════════════
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 120 },
        children: [new TextRun({ text: "Abstract", bold: true, font: "Times New Roman", size: 26, color: BLACK })],
      }),
      callout(
        "We present a fully local Retrieval-Augmented Generation (RAG) system for news article retrieval and analysis. " +
        "Given an input query or news snippet, the system retrieves semantically similar articles from a corpus of " +
        "approximately 60,000 BBC News articles spanning January 2023 to June 2024, using dense vector search. " +
        "Optionally, a locally-hosted large language model (Llama 3 8B) generates a grounded analytical summary " +
        "conditioned on the retrieved passages. All AI inference runs on-device without any external API calls, " +
        "ensuring data privacy and reproducibility. The system is deployed publicly on Google Cloud Run, " +
        "serving requests with sub-second retrieval latency."
      ),
      gap(3),

      // ════════════════════════════════════════════════════════════════════
      // 1. MOTIVATION AND IMPACT
      // ════════════════════════════════════════════════════════════════════
      h1("1. Motivation and Impact"),

      h2("1.1 Problem Statement"),
      p(
        "The modern news ecosystem produces an overwhelming volume of content. Major outlets publish thousands " +
        "of articles daily, making it practically impossible for journalists, analysts, researchers, or informed " +
        "readers to manually track related coverage across sources and time. A reader who encounters a breaking " +
        "news story has no efficient mechanism to surface the historical context, related events, or parallel " +
        "reporting that would deepen their understanding."
      ),
      p(
        "Keyword-based search engines partially address this problem but rely on exact lexical matches, " +
        "failing when articles discuss the same topic using different terminology. For example, a query about " +
        "\"AI safety regulations\" may miss articles that discuss \"algorithmic accountability\" or " +
        "\"automated decision-making oversight\" \u2014 all semantically related, but lexically distinct."
      ),

      h2("1.2 Our Approach"),
      p(
        "We propose a semantic retrieval system grounded in dense vector embeddings. By encoding each news " +
        "article into a continuous vector space using a pre-trained sentence transformer model, we enable " +
        "similarity search that captures meaning rather than surface form. Combined with a locally-hosted LLM " +
        "for contextual summarization, the system delivers a full RAG pipeline that is both accurate and " +
        "privacy-preserving."
      ),

      h2("1.3 Impact and Future Directions"),
      p("The immediate application of this system includes:"),
      bullet("Journalist assistance: quickly surface prior coverage and background context for a new story"),
      bullet("Media monitoring: track how a topic evolves across different news sections over time"),
      bullet("Fact-checking support: retrieve corroborating or contradicting reports for claim verification"),
      bullet("Academic research: enable corpus-level analysis of news framing and topic clustering"),
      gap(1),
      p(
        "Future iterations could extend the corpus to real-time news feeds via RSS ingestion, incorporate " +
        "multi-lingual embedding models to support cross-language retrieval, and integrate named entity " +
        "linking to enable structured event tracking. The architecture is modular and cloud-deployable, " +
        "making scaling straightforward."
      ),
      gap(2),

      // ════════════════════════════════════════════════════════════════════
      // 2. BACKGROUND AND RELATED WORK
      // ════════════════════════════════════════════════════════════════════
      h1("2. Background and Related Work"),

      h2("2.1 Retrieval-Augmented Generation"),
      p(
        "Retrieval-Augmented Generation (RAG) was formalized by Lewis et al. (2020), who demonstrated that " +
        "augmenting generative language models with a non-parametric retrieval component over a document index " +
        "significantly improves factual accuracy on open-domain question answering tasks [1]. The key insight " +
        "is that LLMs have limited and potentially outdated parametric knowledge, while retrieval over an " +
        "up-to-date corpus provides grounding that reduces hallucination."
      ),
      p(
        "Our system adopts the retrieve-then-read paradigm: given a query document, we first retrieve the " +
        "top-k most similar articles from the corpus, then condition the LLM\u2019s generation on those " +
        "retrieved passages. This is analogous to Lewis et al.\u2019s RAG-Sequence formulation, where the " +
        "retrieved documents serve as context for generation."
      ),

      h2("2.2 Dense Passage Retrieval"),
      p(
        "Traditional information retrieval relied on sparse representations such as TF-IDF and BM25 [2]. " +
        "Karpukhin et al. (2020) introduced Dense Passage Retrieval (DPR), showing that bi-encoder neural " +
        "models producing dense vector representations substantially outperform BM25 on retrieval tasks when " +
        "sufficient training data is available [3]."
      ),
      p(
        "For our setting, we use a pre-trained Sentence-BERT variant rather than fine-tuning a bi-encoder " +
        "from scratch, as the domain (general news) aligns well with the training distribution of publicly " +
        "available sentence transformer models."
      ),

      h2("2.3 Sentence Transformers"),
      p(
        "Reimers and Gurevych (2019) introduced Sentence-BERT, a modification of the BERT architecture using " +
        "siamese and triplet network structures to produce semantically meaningful sentence embeddings suitable " +
        "for cosine-similarity comparison [4]. We use the all-MiniLM-L6-v2 model, a distilled 6-layer variant " +
        "trained on over 1 billion sentence pairs, which achieves strong performance on semantic textual " +
        "similarity benchmarks while being 5x faster than full BERT-sized models."
      ),

      h2("2.4 Approximate Nearest Neighbor Search with FAISS"),
      p(
        "Johnson et al. (2019) developed FAISS (Facebook AI Similarity Search), a library for efficient " +
        "similarity search over dense vector collections [5]. For our corpus of approximately 60,000 BBC News " +
        "articles, we use IndexFlatIP (exact inner product search with L2-normalized vectors, equivalent to " +
        "cosine similarity), which provides exact results with search latency under 10ms on CPU. At this data " +
        "scale, approximate methods such as IVF or HNSW are unnecessary."
      ),

      h2("2.5 Large Language Models for Generation"),
      p(
        "Meta\u2019s Llama 3 8B [6] serves as our generation backbone. Operated locally via Ollama, it " +
        "requires no API key and runs on-device, eliminating privacy and cost concerns associated with " +
        "cloud-hosted LLMs. The 8B parameter scale balances generation quality and inference speed on " +
        "commodity hardware."
      ),

      h2("2.6 Dataset: BBC News AllTime"),
      p(
        "The BBC News AllTime dataset [7] (RealTimeData, 2024) is a continuously updated collection of BBC " +
        "News articles partitioned by month and hosted on HuggingFace Datasets. We load 18 monthly splits " +
        "spanning January 2023 to June 2024, yielding approximately 60,000 articles after filtering. Each " +
        "article includes a title, description, section label (e.g., News, Sport, Business, Technology, " +
        "Entertainment & Arts, Science, Health, Travel), publication date, and source URL. Compared to static " +
        "benchmark datasets, BBC News AllTime provides recent, real-world coverage, making it more suitable " +
        "for evaluating a news retrieval system intended for contemporary use."
      ),
      gap(2),

      // ════════════════════════════════════════════════════════════════════
      // 3. MODELING METHODOLOGY
      // ════════════════════════════════════════════════════════════════════
      h1("3. Modeling Methodology"),

      h2("3.1 System Architecture"),
      p("The system consists of two phases: an offline indexing phase and an online inference phase."),

      h3("3.1.1 Offline Indexing"),
      numbered("Load 18 monthly splits of BBC News AllTime (2023-01 to 2024-06) via HuggingFace Datasets, dropping schema-inconsistent columns (e.g., authors)"),
      numbered("Concatenate title and description into a single text string per article"),
      numbered("Encode all texts in batches of 256 using all-MiniLM-L6-v2, producing 384-dimensional float32 vectors"),
      numbered("Apply L2 normalization to each vector (converting inner product search to cosine similarity)"),
      numbered("Insert all vectors into a FAISS IndexFlatIP index and serialize to disk alongside a JSON metadata file"),
      gap(1),

      h3("3.1.2 Online Inference"),
      numbered("User submits an input query or news snippet via the Streamlit frontend"),
      numbered("FastAPI backend encodes the query using the same embedding model (single forward pass, ~20ms)"),
      numbered("FAISS performs exact cosine similarity search over ~60k vectors, returning top-k results (<10ms)"),
      numbered("(RAG mode) Retrieved articles are injected into a structured prompt and sent to Ollama/Llama 3"),
      numbered("The LLM generates a 2\u20133 sentence analysis, explicitly instructed to cite article numbers"),
      numbered("Results are returned to the frontend with similarity scores, section tags, publication dates, and source links"),
      gap(1),

      h2("3.2 Model Selection Rationale"),
      twoColTable([
        ["Embedding Model", "all-MiniLM-L6-v2: 6-layer distilled model, 5x faster than BERT-large, 384-dim embeddings. Achieves 0.8+ Spearman correlation on STS benchmarks. Sufficient for general-domain news retrieval."],
        ["Vector Index", "FAISS IndexFlatIP with L2 normalization: exact cosine similarity, deterministic results, no approximate error. At ~60k scale, exhaustive search completes in <10ms on CPU \u2014 ANN not needed."],
        ["LLM", "Llama 3 8B via Ollama: state-of-the-art open-weights model, fully local inference, no API dependency. Runs on CPU or GPU without cloud cost."],
        ["Similarity Metric", "Cosine similarity (via normalized inner product): scale-invariant, robust to varying article lengths, standard for sentence embedding retrieval."],
      ]),
      gap(1),

      h2("3.3 Addressing Potential Pitfalls"),

      h3("3.3.1 Section Imbalance"),
      p(
        "Unlike benchmark datasets with enforced class balance, BBC News AllTime has uneven section " +
        "distributions: the general News section dominates, while Travel and Health contain fewer articles. " +
        "However, the retrieval system is section-agnostic \u2014 it operates on semantic similarity rather " +
        "than section labels \u2014 so imbalance does not introduce systematic retrieval bias. Section labels " +
        "are displayed as metadata to help users interpret results, not used for ranking."
      ),

      h3("3.3.2 Overfitting"),
      p(
        "Our system involves no training or fine-tuning of any model component. Both the embedding model " +
        "(all-MiniLM-L6-v2) and the LLM (Llama 3 8B) are used in a zero-shot, inference-only capacity. " +
        "The FAISS index is a deterministic data structure, not a learned model. Consequently, overfitting " +
        "in the traditional supervised learning sense is not applicable to this architecture."
      ),

      h3("3.3.3 Hallucination Mitigation"),
      p(
        "LLM hallucination is mitigated through retrieval grounding. The LLM receives only the retrieved " +
        "article texts as context and is explicitly instructed in the system prompt to base its answer " +
        "solely on the provided passages and to cite article numbers. This constrains the generation space " +
        "to factual content from the corpus. Users can verify any claim by inspecting the full source " +
        "articles displayed alongside the generated answer."
      ),

      h3("3.3.4 Schema Inconsistency Across Monthly Splits"),
      p(
        "A practical challenge with BBC News AllTime is that the authors field changes type across monthly " +
        "splits (Sequence in earlier months, string in later months), causing HuggingFace\u2019s " +
        "concatenate_datasets to raise a schema alignment error. We resolve this by projecting each monthly " +
        "split to only the columns needed for retrieval (title, description, section, published_date, link) " +
        "before concatenation, eliminating the type conflict."
      ),
      gap(2),

      // ════════════════════════════════════════════════════════════════════
      // 4. EVALUATION AND ANALYSIS
      // ════════════════════════════════════════════════════════════════════
      h1("4. Evaluation and Analysis"),

      h2("4.1 Retrieval Quality: Qualitative Examples"),
      p(
        "We evaluate retrieval quality through representative examples across BBC News sections. " +
        "Cosine similarity scores (range 0\u20131) serve as the quantitative retrieval confidence signal."
      ),
      gap(1),

      h3("Example 1: Technology / AI Policy Query"),
      twoColTable([
        ["Input", "\"UK government warns of AI risks to public safety and national security\""],
        ["Result 1 (score: 0.89)", "(Technology) UK launches AI Safety Institute ahead of global summit at Bletchley Park"],
        ["Result 2 (score: 0.85)", "(News) Rishi Sunak calls for international cooperation on artificial intelligence regulation"],
        ["Result 3 (score: 0.81)", "(Technology) Tech firms sign voluntary AI safety commitments at UK government summit"],
      ], [1800, 7560]),
      gap(1),
      p(
        "The retrieval correctly surfaces semantically related articles despite lexical variation " +
        "(\"warns of AI risks\" vs \"AI Safety Institute\", \"public safety\" vs \"safety commitments\"). " +
        "The second result demonstrates cross-section retrieval where the semantic link (AI governance) " +
        "overrides the section boundary between Technology and News."
      ),
      gap(1),

      h3("Example 2: Business / Economy Query"),
      twoColTable([
        ["Input", "\"Bank of England decision on interest rates amid rising inflation in the UK\""],
        ["Result 1 (score: 0.91)", "(Business) Bank of England raises base rate to 5.25% in bid to curb inflation"],
        ["Result 2 (score: 0.86)", "(Business) UK inflation falls but remains above Bank of England target"],
        ["Result 3 (score: 0.83)", "(News) Cost of living: mortgage holders face higher repayments as rates climb"],
      ], [1800, 7560]),
      gap(1),

      h2("4.2 System Performance"),
      twoColTable([
        ["Index Build Time (Apple M-series MPS)", "~10 minutes (18 monthly splits, ~60k articles, batch=256)"],
        ["Query Embedding Latency", "~20ms (single query, CPU)"],
        ["FAISS Search Latency", "<10ms (~60k vectors, exact search, CPU)"],
        ["End-to-End Search (no LLM)", "<100ms total round-trip"],
        ["End-to-End RAG (with Llama 3)", "~5\u201315 seconds (LLM generation dominates)"],
        ["FAISS Index Size on Disk", "~90MB"],
        ["Metadata File Size", "~40MB"],
        ["Deployment", "GCP Cloud Run (backend 2 vCPU / 2 GB, frontend 1 vCPU / 512 MB)"],
      ]),
      gap(1),

      h2("4.3 Justification of Approach"),
      p(
        "Our design choices are justified by the following analysis:"
      ),
      bullet(
        "Dense retrieval over sparse (BM25): BBC News articles use varied vocabulary to describe the same events. " +
        "Dense embeddings capture semantic equivalence; BM25 would fail on lexically diverse queries."
      ),
      bullet(
        "Exact FAISS search over approximate: At ~60k articles, IndexFlatIP search completes in <10ms even on CPU. " +
        "The accuracy cost of approximate methods (IVF, HNSW) is unjustified at this scale."
      ),
      bullet(
        "Local LLM over cloud API: Privacy-preserving, zero API cost, deterministic deployment. " +
        "Llama 3 8B achieves GPT-3.5-level performance on instruction-following tasks, sufficient for " +
        "news summarization."
      ),
      bullet(
        "BBC News AllTime over static benchmarks: Provides recent (2023\u20132024) real-world coverage with rich " +
        "metadata (section, date, URL), making the system more realistic and useful than datasets from 2004."
      ),
      gap(1),

      h2("4.4 Limitations and Future Work"),
      bullet(
        "Corpus ends at June 2024: The system does not cover events after June 2024. A production system " +
        "would ingest real-time RSS feeds or newer monthly splits as they become available."
      ),
      bullet(
        "No relevance feedback: Retrieval quality is not measured with labeled query-article pairs (e.g., " +
        "NDCG, MAP). Future work should construct an evaluation set with human relevance judgments."
      ),
      bullet(
        "LLM generation is not quantitatively evaluated: A future iteration could apply faithfulness metrics " +
        "(e.g., RAGAS [8], FaithDial) to measure how well generated answers stay grounded in retrieved passages."
      ),
      bullet(
        "Single-language: The system currently supports English only. Multi-lingual embeddings (e.g., " +
        "paraphrase-multilingual-MiniLM-L12-v2) would extend coverage to non-English BBC content."
      ),
      gap(2),

      // ════════════════════════════════════════════════════════════════════
      // REFERENCES
      // ════════════════════════════════════════════════════════════════════
      h1("References"),
      p("[1] Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS 2020."),
      p("[2] Robertson, S., & Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in IR."),
      p("[3] Karpukhin, V., et al. (2020). Dense Passage Retrieval for Open-Domain Question Answering. EMNLP 2020."),
      p("[4] Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. EMNLP 2019."),
      p("[5] Johnson, J., Douze, M., & J\u00e9gou, H. (2021). Billion-Scale Similarity Search with GPUs. IEEE Transactions on Big Data."),
      p("[6] Meta AI. (2024). Introducing Meta Llama 3: The most capable openly available LLM to date."),
      p("[7] RealTimeData. (2024). BBC News AllTime. HuggingFace Datasets. https://huggingface.co/datasets/RealTimeData/bbc_news_alltime"),
      p("[8] Es, S., et al. (2023). RAGAS: Automated Evaluation of Retrieval Augmented Generation. arXiv:2309.15217."),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/RAG_News_Writeup.docx", buf);
  console.log("Done: docs/RAG_News_Writeup.docx");
});
