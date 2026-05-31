---
name: pdf-reporter
description: >
  自动PDF研究报告生成器。接收报告标题、章节结构和图表描述，自动渲染技术图表并组装为专业A4 PDF。
  支持10+技术领域、30+图表类型，内置中文支持。Agent在需要生成研报、导出PDF或整理报告时自动调用。
user-invocable: true
---

# PDF Reporter — 自动研究报告生成器

将对话中的研究成果自动整理为带图表的专业 PDF 报告。

---

## 安装到 Kimi CLI

### 一键安装（推荐）

```bash
git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
cd research-result2pdf-skill
node install.js
```

`install.js` 会自动：
1. 将 skill 链接到 `~/.kimi-code/skills/pdf-reporter/`
2. 验证安装完整性

**依赖采用懒加载模式**：`setup.js` 不需要在 clone 后手动执行，Agent 首次调用时会自动检测并提示安装。

### 手动安装

```bash
git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
cp -r research-result2pdf-skill ~/.kimi-code/skills/pdf-reporter
```

---

## 懒加载依赖安装

Skill 的 Python 依赖（reportlab、matplotlib 等）采用**懒加载**模式：

1. Agent 首次调用 `generatePdf()` 时，自动检测 Python 环境
2. 如检测到缺失，抛出包含明确安装指令的错误
3. Agent 收到错误后，自动运行 `node setup.js` 安装依赖
4. 安装完成后，Agent 重试 `generatePdf()`

**Agent 处理流程**：
```
try {
  await reporter.generatePdf({ context, struct, desc });
} catch (e) {
  if (e.message.includes('依赖未就绪')) {
    // 首次调用，自动安装依赖
    const { execSync } = require('child_process');
    execSync('node ~/.kimi-code/skills/pdf-reporter/setup.js', { stdio: 'inherit' });
    // 重试
    await reporter.generatePdf({ context, struct, desc });
  }
}
```

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

## 输入结构规范

Agent 从对话上下文中提取或生成以下三部分内容，组织为 JSON 后调用 Skill。

### 1. `context` — 报告主题

一句话描述报告核心主题，作为 PDF 封面标题。

```javascript
context: "AI芯片高速互联技术深度研究报告"
```

### 2. `struct` — 报告结构数组

定义报告的章节、文字内容和图表占位符。

| 类型 | 必需字段 | 说明 |
|------|----------|------|
| `cover` | `title`, `subtitle` | 封面页，自动居中大标题 |
| `heading` | `text`, `level` | 章节标题，`level: 1` 一级标题，`level: 2` 二级标题 |
| `paragraph` | `text` | 正文段落，支持 `<strong>加粗文字</strong>` |
| `bullet` | `text` | 要点列表项（自动加 `•` 前缀） |
| `summary` | `text` | 蓝色摘要框，用于执行摘要/核心观点 |
| `table` | `data`, `colWidths` | 表格，`data[0]` 为表头行，`colWidths` 为每列宽度(可选) |
| `diagram` | `ref`, `layout`, `caption` | **图表占位符**，`ref` 对应 `desc` 中的 `id` |
| `pagebreak` | — | 强制分页 |

**`diagram` 的 `layout` 选项**：
- `fullwidth` — 占满页面宽度（默认，适合大多数图表）
- `inline` — 行内小图（55%宽度，<18%页面高度，适合公式）
- `halfwidth` — 半宽（48%宽度，两图并排）
- `standalone` — 独占一页（95%宽度，<85%高度，适合复杂架构图）

### 3. `desc` — 图表描述数组

每张需要自动渲染的图表的详细规格。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | **唯一标识**，被 `struct` 中的 `diagram.ref` 引用 |
| `domain` | string | 技术领域，决定使用哪个渲染器 |
| `chartType` | string | 图表类型，见下方「支持的图表类型」 |
| `input` | object | 图表专用输入参数，因类型而异 |
| `caption` | string | 图注文字（显示在图表下方） |
| `format` | string | 输出格式，默认 `png` |
| `dpi` | number | 分辨率，默认 `200` |

---

## 支持的图表类型

### CS / 计算机系统
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `flowchart` | `{ dsl: "flowchart TD; A-->B;" }` | 流程图（mermaid 语法） |
| `architecture` | `{ dsl: "graph TD; ..." }` | 系统架构图 |
| `uml` | `{ dsl: "classDiagram; ..." }` | UML 图 |
| `er` | `{ dsl: "erDiagram; ..." }` | ER 图 |
| `statemachine` | `{ dsl: "stateDiagram; ..." }` | 状态机 |
| `gantt` | `{ dsl: "gantt; ..." }` | 甘特图 |

### Math / 数学
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `formula` | `{ latex: "E = mc^2" }` | LaTeX 公式（**注意**：不要加 `$` 包裹） |
| `geometry` | `{ shape: "triangle", labels: ["A","B","C"] }` | 几何图形 |
| `function` | `{ func: "sin(x)", range: [-3.14, 3.14] }` | 函数图像 |

### AI / 人工智能
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `neuralnet` | `{ layers: [5,8,6,3], title: "..." }` | 神经网络架构图 |
| `trainingcurve` | `{ model: "resnet50", epochs: 90 }` | 训练曲线（loss vs epoch） |
| `heatmap` | `{ data: [[0.8,0.1], [0.1,0.9]], labels: ["A","B"] }` | 注意力/混淆矩阵热图 |
| `confusion` | 同 heatmap | 混淆矩阵（自动标注百分比） |
| `pipeline` | `{ dsl: "flowchart LR; RawData-->Preprocess-->Model-->Deploy" }` | 机器学习流程图 |

### Chip / 芯片设计
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `architecture` | `{ dsl: "..." }` | 芯片架构图（d2/mermaid） |
| `timing` | `{ signals: [{name:"CLK", wave:"010101"}] }` | 时序图 |
| `noc` | `{ topology: "mesh", nodes: [...], size: 4 }` | NoC 网络拓扑图 |
| `circuit` | `{ components: [...], connections: [...] }` | 电路原理图 |

### Physics / 物理
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `formula` | `{ latex: "F = ma" }` | 物理公式 |
| `banddiagram` | `{ bands: [{name:"CB", energy:[...]}] }` | 能带图 |
| `field` | `{ fieldType: "electric", charges: [...] }` | 电磁场分布图 |

### Network / 网络
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `topology` | `{ nodes: [{id:"R1",label:"路由器1"}], links: [...] }` | 网络拓扑图 |
| `protocolstack` | `{ layers: ["应用层","传输层","网络层"] }` | 协议栈图 |
| `packet` | `{ fields: [{name:"Flag",size:8}] }` | 数据包格式图 |

### General / 通用
| chartType | 输入示例 | 说明 |
|-----------|----------|------|
| `chart` | `{ chartType: "bar", labels: [...], values: [...] }` | 柱状图/折线图/饼图 |
| `table` | `{ headers: [...], rows: [...] }` | 数据表格（作为图表渲染） |
| `sankey` | `{ nodes: [...], flows: [...] }` | 桑基图（流量分配） |
| `mindmap` | `{ dsl: "# 中心主题\n## 分支1\n### 子节点" }` | 思维导图 |

---

## 调用方式

```javascript
const reporter = require('skill/pdf-reporter');

// 可选：初始化，创建 reports/ 目录
reporter.init();

// 生成报告
const result = await reporter.generatePdf({
  context: "AI芯片高速互联技术深度研究报告",
  struct: [ /* 章节结构 */ ],
  desc: [ /* 图表描述 */ ],
  outputPath: "reports/my_report.pdf"  // 可选，默认 reports/YYYY-MM-DD_report.pdf
});

// result = { success: true, path: "...", size: 123456, pages: 6, images: 7 }
```

Agent 将 `result.path` 告知用户即可。

---

## 完整示例

```javascript
const reporter = require('skill/pdf-reporter');

const result = await reporter.generatePdf({
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
      domain: "cs",
      chartType: "flowchart",
      input: { dsl: "flowchart LR\nA[电信号] --> B[激光器] --> C[光纤] --> D[探测器] --> E[电信号]" },
      caption: "光模块光电转换流程"
    },
    {
      id: "fig_formula",
      domain: "math",
      chartType: "formula",
      input: { latex: "\\alpha(f) = \\alpha_0 \\sqrt{f} + \\alpha_{diel} f + \\frac{\\alpha_{rad}}{R}" },
      caption: "传输线损耗模型"
    },
    {
      id: "fig_noc",
      domain: "chip",
      chartType: "noc",
      input: { topology: "mesh", nodes: ["C00","C01","C02","C03","C10","C11","C12","C13"], size: 4 },
      caption: "4x4 Mesh NoC架构"
    }
  ]
});
```

更多示例见 `templates/` 目录：
- `templates/minimal-report.json` — 最小可用示例（1段文字+1张图）
- `templates/report-spec.example.json` — 完整研报示例（封面+多章节+多种图表）

---

## 文件输出位置

| 文件 | 位置 | 说明 |
|------|------|------|
| PDF 报告 | `reports/YYYY-MM-DD_report.pdf` | 默认输出路径 |
| 临时工作文件 | `os.tmpdir()/pdf-reporter-*/` | 图表渲染中间文件 |
| 输入模板 | `templates/*.json` | 参考示例 |

Agent 生成报告时，**优先使用 `reports/` 子目录**存放输出，保持工作目录整洁。

---

## 注意事项

1. **LaTeX 公式不要加 `$` 包裹** — `latex: "E = mc^2"` 即可，renderer 会自动处理
2. **图表顺序** — `desc` 数组中的顺序不影响最终排版，以 `struct` 中 `ref` 引用的顺序为准
3. **文字长度** — `paragraph` 建议控制在 300 字以内，过长会自动换行
4. **每页图表数量** — 建议每页不超过 2 张图，`standalone` 布局独占一页
5. **依赖检查** — 首次使用前运行 `node setup.js`，如跳过可能导致渲染失败
6. **中文字体** — PDF 使用系统 SimHei 字体（Windows）或 WenQuanYi（Linux），如不存在请设置 `TDK_FONT_PATH` 环境变量

---

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| "Python 环境检查失败" | Python 未安装或版本 < 3.8 | 安装 Python 3.8+ 并设置 `TDK_PYTHON` 环境变量 |
| "reportlab 缺失" | Python 包未安装 | 运行 `node setup.js` 自动安装 |
| 图表渲染失败 | mermaid/d2/graphviz CLI 未安装 | 这些是可选依赖，不影响核心功能；或按提示安装 |
| 中文显示为方块 | 系统缺少中文字体 | 安装 SimHei 或设置 `TDK_FONT_PATH` |
| PDF 页数显示 null | pymupdf 未安装 | 运行 `pip install pymupdf`（可选） |
