const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer,
} = require("docx");
const fs = require("fs");

// ── Color palette ──────────────────────────────────────────────────────────
const BLUE      = "1F4E79";
const LIGHTBLUE = "D6E4F0";
const MIDBLUE   = "2E75B6";
const GRAY      = "F5F5F5";
const BLACK     = "000000";
const WHITE     = "FFFFFF";

// ── Helpers ────────────────────────────────────────────────────────────────
const border = (color = "CCCCCC") => ({
  top:    { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left:   { style: BorderStyle.SINGLE, size: 1, color },
  right:  { style: BorderStyle.SINGLE, size: 1, color },
});

function cell(text, { bold = false, shade = null, width = 4680, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders: border("CCCCCC"),
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, font: "Arial", size: 20, color: BLACK })],
    })],
  });
}

function headerCell(text, width = 4680) {
  return cell(text, { bold: true, shade: LIGHTBLUE, width });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: BLUE })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: MIDBLUE })],
  });
}

function body(text, { spacing = 160 } = {}) {
  return new Paragraph({
    spacing: { before: 60, after: spacing },
    children: [new TextRun({ text, font: "Arial", size: 22, color: BLACK })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: BLACK })],
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCDDEE", space: 1 } },
    spacing: { before: 80, after: 80 },
    children: [],
  });
}

// ── Stack table ────────────────────────────────────────────────────────────
function stackTable() {
  const rows = [
    ["类别", "技术选型", "说明"],
    ["数据集", "AG News (HuggingFace)", "4 类别 120,000 条英文新闻，含标题与描述"],
    ["Embedding 模型", "all-MiniLM-L6-v2", "sentence-transformers，384 维向量，速度/精度均衡"],
    ["向量数据库", "FAISS (IndexFlatIP)", "余弦相似度检索，暴力精确搜索，<10ms 响应"],
    ["大语言模型", "Llama 3 8B (Ollama)", "完全本地推理，无需 API Key，支持 GPU 加速"],
    ["后端框架", "FastAPI", "提供 /search 与 /rag 两个端点，异步处理"],
    ["前端界面", "Streamlit", "单页 Web 应用，支持检索与 RAG 两种模式"],
    ["本地开发", "MacBook Pro M4 (arm64)", "MPS 加速 Embedding，Ollama 原生支持 Apple Silicon"],
    ["生产部署", "GCP VM (NVIDIA L4)", "us-central1-b，g2-standard-8，23GB 显存"],
  ];

  const colWidths = [2000, 2800, 4560];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map((cols, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: cols.map((text, j) =>
          i === 0
            ? headerCell(text, colWidths[j])
            : cell(text, { shade: i % 2 === 0 ? GRAY : null, width: colWidths[j] })
        ),
      })
    ),
  });
}

// ── Workflow table ─────────────────────────────────────────────────────────
function workflowTable() {
  const steps = [
    ["1", "加载数据集", "HuggingFace datasets 一行加载 AG News train split (120k 条)"],
    ["2", "生成向量", "all-MiniLM-L6-v2 批量 Encode，256 条/批，L2 归一化"],
    ["3", "建立索引", "FAISS IndexFlatIP 存储 120k 个 384 维向量到磁盘"],
    ["4", "用户输入", "粘贴新闻文本，Streamlit 发请求到 FastAPI"],
    ["5", "向量检索", "Query Embed → FAISS 搜索 Top-K → 返回最相似文章"],
    ["6", "生成回答", "(RAG 模式) 将检索结果拼入 Prompt，Ollama 调用 Llama 3 生成分析"],
  ];

  const colWidths = [600, 2000, 6760];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["步骤", "阶段", "详情"].map((t, j) => headerCell(t, colWidths[j])),
      }),
      ...steps.map((cols, i) =>
        new TableRow({
          children: cols.map((text, j) =>
            cell(text, { shade: i % 2 === 0 ? GRAY : null, width: colWidths[j],
              bold: j === 0, align: j === 0 ? AlignmentType.CENTER : AlignmentType.LEFT })
          ),
        })
      ),
    ],
  });
}

// ── Document ───────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: MIDBLUE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MIDBLUE, space: 1 } },
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "CS6120 NLP Project  |  RAG News Retrieval System", font: "Arial", size: 18, color: "888888" })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDBLUE, space: 1 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Arial", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" }),
          ],
        })],
      }),
    },
    children: [
      // ── Title ─────────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "RAG 新闻检索系统", bold: true, font: "Arial", size: 52, color: BLUE })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Retrieval-Augmented Generation for News Article Search", font: "Arial", size: 26, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "CS6120 Natural Language Processing  \u2014  Northeastern University", font: "Arial", size: 22, color: "888888" })],
      }),
      divider(),

      // ── 1. 项目简介 ────────────────────────────────────────────────────
      h1("1. 项目简介"),
      body("本项目构建了一个完全本地运行的 RAG（检索增强生成）新闻检索系统。用户输入一段新闻文本，系统自动从 12 万条 AG News 语料库中检索最相关的文章，并可选择调用本地 Llama 3 大模型生成综合分析。整个系统零 API 调用，所有 AI 推理均在本地或 GCP GPU 上完成。"),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),

      // ── 2. 数据集 ──────────────────────────────────────────────────────
      h1("2. 数据集：AG News"),
      body("AG News 是学术界广泛使用的英文新闻分类基准数据集，具有以下特点："),
      bullet("来源：Academic Guardian，收录 2004 年真实新闻"),
      bullet("规模：训练集 120,000 条 + 测试集 7,600 条"),
      bullet("字段：title（标题）+ description（摘要），每条约 50-80 词"),
      bullet("分类：World（世界）/ Sports（体育）/ Business（商业）/ Sci/Tech（科技）"),
      bullet("加载方式：HuggingFace datasets 库一行代码，无需注册或手动下载"),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),

      // ── 3. 技术栈 ──────────────────────────────────────────────────────
      h1("3. 技术栈总览"),
      new Paragraph({ spacing: { before: 80, after: 160 }, children: [] }),
      stackTable(),
      new Paragraph({ spacing: { before: 160, after: 80 }, children: [] }),

      // ── 4. 系统架构 ────────────────────────────────────────────────────
      h1("4. 系统架构与工作流程"),
      new Paragraph({ spacing: { before: 80, after: 160 }, children: [] }),
      workflowTable(),
      new Paragraph({ spacing: { before: 200, after: 80 }, children: [] }),

      h2("4.1 检索阶段（Search）"),
      body("用户输入的新闻文本经 all-MiniLM-L6-v2 编码为 384 维向量后 L2 归一化，FAISS 使用内积（等价于余弦相似度）从 12 万向量中找出 Top-K 最相似文章，延迟 <10ms。"),

      h2("4.2 生成阶段（RAG）"),
      body("检索结果拼接为上下文 Prompt，发送给本地 Ollama 运行的 Llama 3 8B 模型，生成 2-3 句综合分析。若 LLM 不可用，系统优雅降级为纯检索结果。"),

      // ── 5. 部署 ────────────────────────────────────────────────────────
      h1("5. 部署架构"),
      h2("5.1 本地开发（MacBook Pro M4）"),
      bullet("Embedding 推理：PyTorch MPS 后端，Apple Silicon GPU 加速"),
      bullet("LLM 推理：Ollama 原生 arm64 支持，直接 brew install"),
      bullet("向量库：faiss-cpu，M4 兼容版本"),
      bullet("索引构建时间：约 5-10 分钟（120k 条）"),

      h2("5.2 生产部署（GCP L4 VM）"),
      bullet("实例类型：g2-standard-8（8 vCPU / 32GB RAM）"),
      bullet("GPU：NVIDIA L4，23GB 显存，CUDA 12.9"),
      bullet("区域：us-central1-b"),
      bullet("对外端口：8000（FastAPI）/ 8501（Streamlit）"),
      bullet("索引构建时间：约 3-5 分钟（GPU 加速）"),
      bullet("按需启停：用完即删，避免持续计费"),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),

      // ── 6. 关键设计 ────────────────────────────────────────────────────
      h1("6. 关键设计决策"),
      bullet("FAISS IndexFlatIP + L2 归一化：实现精确余弦相似度，12 万数据量暴力搜索已足够快，无需近似算法"),
      bullet("all-MiniLM-L6-v2：6 层 Transformer，384 维，推理速度比 large 模型快 5x，适合实时检索"),
      bullet("Llama 3 8B via Ollama：无需 API Key，支持 GPU 加速，LLM 挂掉时系统自动降级"),
      bullet("Streamlit 前端：极简开发，支持两种模式（纯检索 / RAG 生成）切换"),
      bullet("索引文件 gitignore：indexes/ 目录不入版本控制，部署时在 VM 上重建（节省 repo 空间）"),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("RAG_News_技术文档.docx", buf);
  console.log("Done: RAG_News_技术文档.docx");
});
