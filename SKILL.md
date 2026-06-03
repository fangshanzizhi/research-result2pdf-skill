---
name: pdf-reporter
description: >
  自动PDF研究报告生成器。Agent 只需组装 {context, struct, desc} 三个字段的数据结构，
  Skill 自动渲染图表并组装为专业 A4 PDF。支持 9 大技术领域、33+ 图表类型，内置中文支持。
user-invocable: true
---

# PDF Reporter — Agent 数据驱动报告生成器

> **Agent 工作流**：阅读本 Skill → 组装 `{context, struct, desc}` 三个字段 → 调用 `generatePdf()` → 拿到 PDF 路径告知用户。
> 
> **Agent 不需要写 JS 文件，不需要 node 执行，不需要操作文件系统。** 只需组织数据，调用一行 API。

---

## Agent 调用时机

当对话中出现以下任何意图时，调用本 Skill：

- "生成一份...报告" / "帮我做一份...研报"
- "把刚才的研究整理成 PDF"
- "出一份带图表的调研报告"
- "导出为 PDF"
- 用户明确要求将多段文字 + 图表整合为 PDF

**不需要调用的情况**：
- 用户只是问问题、讨论思路（还没到产出阶段）
- 用户明确要求输出 Markdown 或其他格式

---

## Agent 工作流（四步）

```
Step 1: 阅读本 SKILL.md，理解 {context, struct, desc} 的数据格式
   ↓
Step 2: 基于对话内容，推理并列出需要的图表类型（可调用 listChartTypes）
   ↓
Step 3: 组装三个字段的数据结构
   ↓
Step 4: 调用 skill API，拿到 PDF 路径，告知用户
```

### Step 1: 理解数据格式

Agent 需要组装三个字段，直接传递给 Skill：

#### `context` — 报告主题

一句话描述报告核心主题，作为 PDF 封面标题。

```javascript
context: "AI芯片高速互联技术深度研究报告"
```

#### `struct` — 报告结构数组

定义报告的章节、文字内容和图表占位符。

| 类型 | 必需字段 | 说明 |
|------|----------|------|
| `cover` | `title`, `subtitle` | 封面页 |
| `heading` | `text`, `level` | 章节标题，`level: 1` 一级，`level: 2` 二级 |
| `paragraph` | `text` | 正文段落，支持 `<strong>加粗</strong>` |
| `bullet` | `text` | 要点列表项（自动加 `•` 前缀） |
| `summary` | `text` | 蓝色摘要框 |
| `table` | `data` | 表格，`data[0]` 为表头行 |
| `diagram` | `ref`, `layout`, `caption` | **图表占位符**，`ref` 对应 `desc` 中的 `id` |
| `pagebreak` | — | 强制分页 |

**`diagram` 的 `layout` 选项**：
- `fullwidth` — 占满页面宽度（默认，适合大多数图表）
- `inline` — 行内小图（适合公式）
- `half` — 半宽（两图并排）
- `standalone` — 独占一页（适合复杂架构图）

#### `desc` — 图表描述数组

每张需要自动渲染的图表的详细规格。

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识，被 `struct` 中的 `ref` 引用 | `"fig1"` |
| `domain` | 技术领域：`general`/`cs`/`math`/`ai`/`chip`/`physics`/`network`/`chemistry`/`manufacturing` | `"general"` |
| `chartType` | 图表类型 | `"chart"` / `"formula"` / `"neuralnet"` / `"molecule"` |
| `input` | 图表专用输入参数 | `{ chartType: "bar", labels: [...], values: [...] }` |
| `caption` | 图注文字 | `"光模块工作流程"` |

### Step 2: 选择图表类型

Agent 根据报告内容选择合适的图表类型。可直接使用 `general` 领域的通用别名，无需记忆具体领域：

| 需求 | domain | chartType | input 示例 |
|------|--------|-----------|------------|
| 柱状图/饼图 | `general` | `chart` | `{ chartType: "bar", labels: [...], values: [...] }` |
| 流程图 | `general` | `flowchart` | D2 语法字符串或 Mermaid DSL |
| 架构图 | `general` | `architecture` | D2 语法字符串 |
| 数学公式 | `general` | `formula` | LaTeX 字符串，如 `"E = mc^2"` |
| 网络拓扑 | `general` | `network` | Graphviz DOT 字符串 |
| 工艺流程 | `general` | `process` | D2/Mermaid 语法字符串 |
| 神经网络 | `ai` | `neuralnet` | `{ layers: [5, 8, 6, 3] }` |
| 分子结构 | `chemistry` | `molecule` | `{ smiles: "CCO" }` |
| 电路图 | `physics`/`chip` | `circuit` | 字符串简写（默认 basic）或 `{ circuitType: "opamp" }` |
| 时序图 | `chip` | `timing` | `{ signals: [...] }` |

> **字符串简写支持**：`formula`、`circuit` 等类型可直接传入字符串，无需包装成对象。

### Step 3: 组织数据

基于对话中的研究内容，Agent 直接组织以下数据结构（**不需要写 JS 文件**）：

```javascript
const reportData = {
  context: "AI芯片高速互联技术深度研究报告",

  struct: [
    { type: "cover", title: "AI芯片高速互联技术深度研究报告",
      subtitle: "从电互连到光互连的技术演进与产业格局" },

    { type: "heading", text: "执行摘要", level: 1 },
    { type: "summary", text: "AI算力爆发驱动芯片互联技术从电互连向光互连演进..." },

    { type: "heading", text: "一、光互连技术原理", level: 1 },
    { type: "paragraph", text: "光模块是通过光学系统实现信号高速互连的核心部件..." },
    { type: "diagram", ref: "fig_flow", layout: "fullwidth", caption: "光模块工作流程" },

    { type: "heading", text: "二、信号完整性分析", level: 1 },
    { type: "paragraph", text: "高速信号在传输线中的衰减模型如下：" },
    { type: "diagram", ref: "fig_formula", layout: "inline", caption: "传输线损耗公式" },

    { type: "heading", text: "三、互连架构", level: 1 },
    { type: "diagram", ref: "fig_noc", layout: "standalone", caption: "4x4 Mesh NoC架构" },

    { type: "heading", text: "四、关键结论", level: 1 },
    { type: "bullet", text: "CPO技术预计2027年规模部署" },
    { type: "bullet", text: "光互连带宽密度是电互连的10倍以上" },
  ],

  desc: [
    {
      id: "fig_flow",
      domain: "general",
      chartType: "flowchart",
      input: `direction: right\nA: 电信号\nB: 激光器\nC: 光纤\nD: 探测器\nE: 电信号\nA -> B -> C -> D -> E`,
      caption: "光模块光电转换流程"
    },
    {
      id: "fig_formula",
      domain: "general",
      chartType: "formula",
      input: "E = mc^2",
      caption: "质能方程"
    },
    {
      id: "fig_noc",
      domain: "chip",
      chartType: "noc",
      input: { topology: "mesh", nodes: ["C00","C01","C02","C03","C10","C11","C12","C13"], size: 4 },
      caption: "4x4 Mesh NoC架构"
    }
  ]
};
```

### Step 4: 调用 API

Agent 直接调用 Skill API（**一行代码**）：

```javascript
const reporter = require('skill/pdf-reporter');

const result = await reporter.generatePdf({
  context: reportData.context,
  struct: reportData.struct,
  desc: reportData.desc,
  // outputPath 可选，默认 reports/YYYY-MM-DD_report.pdf
});

// result = { success: true, path: "reports/... .pdf", size: 123456, pages: 6, images: 3 }
```

Agent 将 `result.path` 告知用户即可。

---

## 沙盒自动安装

Skill 采用**沙盒模式**管理依赖：

1. 首次调用 `generatePdf()` 时，自动在项目根目录创建 `.pdf-reporter/` 沙盒
2. 沙盒内创建 Python venv，自动安装 reportlab/matplotlib/numpy/pymupdf/schemdraw/rdkit
3. 自动下载并安装 CLI 工具：d2 (GitHub Releases)、graphviz (GitLab Releases)、mermaid-cli (npm)
4. 所有依赖隔离在沙盒内，不污染系统环境
5. 安装失败时自动降级，不影响核心功能

**Agent 无需手动安装任何依赖**，首次调用会自动完成全部初始化。

---

## 图表类型速查表

Agent 在 `struct` 中放置 `diagram` 占位符，在 `desc` 中定义图表规格。以下每种图表类型均给出 **可直接复制修改的完整模板**。

> 所有模板中：`struct[i]` 是 `diagram` 占位符，`desc[j]` 是对应的图表定义。

---

### 柱状图 / 折线图 / 饼图

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_chart", layout: "fullwidth", caption: "季度营收对比" }

// desc 中的图表定义
{
  id: "fig_chart",
  domain: "general",
  chartType: "chart",
  input: {
    chartType: "bar",        // 可选: "bar" / "line" / "pie"
    labels: ["Q1", "Q2", "Q3", "Q4"],
    values: [120, 190, 150, 220]
  },
  caption: "季度营收对比"
}
```

> `chartType` 在 `input` 内部，控制图表子类型。

---

### 流程图（通用）

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_flow", layout: "fullwidth", caption: "系统工作流程" }

// desc 中的图表定义（D2 语法）
{
  id: "fig_flow",
  domain: "general",
  chartType: "flowchart",
  input: `direction: right\nA: 输入\nB: 处理\nC: 输出\nA -> B -> C`,
  caption: "系统工作流程"
}
```

> 也可使用 Mermaid 语法。如 mermaid-cli 未安装，会 fallback 到 d2。

---

### 架构图（通用）

```javascript
{
  id: "fig_arch",
  domain: "general",
  chartType: "architecture",
  input: `direction: right\nFrontend: Web App\n  Backend: API Gateway\n    Database: PostgreSQL\nFrontend -> Backend\nBackend -> Database`,
  caption: "系统架构图"
}
```

---

### LaTeX 公式（通用）

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_formula", layout: "inline", caption: "传输线损耗公式" }

// desc 中的图表定义
{
  id: "fig_formula",
  domain: "general",
  chartType: "formula",
  input: "E = mc^2",        // 字符串简写，无需包裹 $
  caption: "质能方程"
}
```

> **字符串简写支持**：直接写 LaTeX 内容即可，不需要加 `$` 包裹。

---

### 网络拓扑（通用）

```javascript
{
  id: "fig_net",
  domain: "general",
  chartType: "network",
  input: `graph G {\n  rankdir=LR;\n  A -- B;\n  A -- C;\n  B -- C;\n}`,
  caption: "网络拓扑"
}
```

---

### 神经网络架构图

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_nn", layout: "standalone", caption: "多层感知机架构" }

// desc 中的图表定义
{
  id: "fig_nn",
  domain: "ai",
  chartType: "neuralnet",
  input: { layers: [5, 8, 6, 3], title: "多层感知机架构" },
  caption: "多层感知机架构"
}
```

> `layers` 数组表示每层的神经元数量。`standalone` 布局适合复杂架构图。

---

### 分子结构

```javascript
{
  id: "fig_mol",
  domain: "chemistry",
  chartType: "molecule",
  input: { smiles: "CC(=O)Oc1ccccc1C(=O)O" },
  caption: "阿司匹林分子结构"
}
```

---

### 电路图

```javascript
{
  id: "fig_circuit",
  domain: "physics",
  chartType: "circuit",
  input: "basic",            // 字符串简写
  caption: "基础RC电路"
}
```

> 也可使用对象：`{ circuitType: "basic" | "opamp" | "logic" }`

---

### 时序图

```javascript
{
  id: "fig_timing",
  domain: "chip",
  chartType: "timing",
  input: {
    signals: [
      { name: "CLK", wave: "p...." },
      { name: "DATA", wave: "x.===x", data: ["D0","D1","D2"] }
    ]
  },
  caption: "时钟信号时序"
}
```

---

### 数据表格（作为图表渲染）

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_table", layout: "fullwidth", caption: "关键企业对比" }

// desc 中的图表定义
{
  id: "fig_table",
  domain: "general",
  chartType: "table",
  input: {
    headers: ["企业", "核心产品", "份额"],
    rows: [
      ["胜宏科技", "57层HDI", "50%"],
      ["沪电股份", "高多层背板", "30%"]
    ]
  },
  caption: "关键企业对比"
}
```

> 注意：`struct` 中也可用原生 `table` 类型（非 `diagram`），区别在于原生 `table` 直接嵌入 PDF，`diagram`+`chartType: "table"` 会生成图片后嵌入。

---

### 桑基图

```javascript
// struct 中的 diagram 占位符
{ type: "diagram", ref: "fig_sankey", layout: "fullwidth", caption: "资金流向桑基图" }

// desc 中的图表定义
{
  id: "fig_sankey",
  domain: "general",
  chartType: "sankey",
  input: {
    nodes: ["收入", "成本", "利润", "研发", "市场"],
    flows: [
      { source: "收入", target: "成本", value: 60 },
      { source: "收入", target: "利润", value: 40 },
      { source: "利润", target: "研发", value: 25 },
      { source: "利润", target: "市场", value: 15 }
    ]
  },
  caption: "资金流向桑基图"
}
```

---

## 输入模板参考

Agent 组装数据时，可参考以下模板：

- `templates/minimal-report.json` — 最小示例（封面+摘要+1段文字+1张图）
- `templates/report-spec.example.json` — 完整研报示例（多章节+多种图表）
- `reports/generate_full_chart_test.js` — 全图表类型测试（10 种图表完整示例）

---

## 安装

```bash
git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
cd research-result2pdf-skill
npm install    # 一键完成全部初始化（约 2-5 分钟）
```

`npm install` 自动完成：skill 链接 + 沙盒创建 + 全部依赖安装。

---

## 注意事项

1. **Agent 不需要写 JS 文件** — 直接组装数据调用 API 即可
2. **LaTeX 公式不要加 `$` 包裹** — `input: "E = mc^2"` 即可
3. **图表顺序** — 以 `struct` 中 `ref` 引用的顺序为准
4. **文字长度** — `paragraph` 建议 200-300 字以内
5. **每页图表** — 建议不超过 2 张，`standalone` 独占一页
6. **中文字体** — 使用系统 SimHei，如缺失设置 `TDK_FONT_PATH`
7. **沙盒初始化** — 首次调用会自动创建 `.pdf-reporter/` 并安装依赖，耗时约 2-5 分钟

---

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| "Python 环境检查失败" | Python 未安装或 < 3.8 | 安装 Python 3.8+，设置 `TDK_PYTHON` |
| "reportlab 缺失" | 沙盒未初始化 | 首次调用会自动安装，或手动运行 `node setup.js` |
| 图表渲染失败 | CLI 工具未就绪 | 沙盒会自动下载 d2/graphviz，如失败可手动运行 `node setup.js` |
| 中文显示为方块 | 系统缺中文字体 | 安装 SimHei 或设 `TDK_FONT_PATH` |
| rdkit 导入失败 | NumPy 版本不兼容 | 沙盒已自动降级 numpy 到 1.26.4 |
