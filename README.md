# PDF Reporter Skill

将研究内容自动生成为带图表的专业 PDF 报告的 Kimi CLI Skill。

## 功能

- **自动图表渲染**：支持 10+ 技术领域、30+ 图表类型（流程图、公式、神经网络、热图、NoC 架构等）
- **中文原生支持**：PDF 使用 SimHei 字体，matplotlib 中文显示正常
- **DPI 精确控制**：200 DPI 图表嵌入，文字与图比例协调
- **一键环境初始化**：`node setup.js` 自动检测 Python 环境并安装依赖

## 快速开始

### 一键安装

```bash
git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
cd research-result2pdf-skill
node install.js
```

`install.js` 会自动将 skill 链接到 `~/.kimi-code/skills/pdf-reporter/`。

**依赖采用懒加载模式**：首次调用时自动检测，缺失则提示 Agent 运行 `node setup.js`。

### Agent 调用

```javascript
const reporter = require('skill/pdf-reporter');

// 生成报告
const result = await reporter.generatePdf({
  context: "AI芯片高速互联技术深度报告",
  struct: [
    { type: "heading", text: "执行摘要", level: 1 },
    { type: "paragraph", text: "光互连是突破电互连带宽瓶颈的关键技术..." },
    { type: "diagram", ref: "fig1", layout: "fullwidth", caption: "光模块工作流程" },
    { type: "heading", text: "关键技术", level: 1 },
    { type: "bullet", text: "CPO技术预计2027年规模部署" },
  ],
  desc: [
    {
      id: "fig1",
      domain: "cs",
      chartType: "flowchart",
      input: { dsl: "flowchart LR\nA[电信号] --> B[激光器] --> C[光纤] --> D[探测器]" },
      caption: "光模块工作流程"
    }
  ]
});

// result = { success: true, path: "reports/2026-05-31_report.pdf", size, pages, images }
```

## 输入结构

| 参数 | 类型 | 说明 |
|------|------|------|
| `context` | string | 报告主题/封面标题 |
| `struct` | array | 章节结构（heading/paragraph/bullet/diagram/table 等） |
| `desc` | array | 图表描述（domain/chartType/input，被 struct 中的 ref 引用） |

完整输入示例见 `templates/report-spec.example.json`。

## 支持的图表类型

| 领域 | 图表类型 | 说明 |
|------|----------|------|
| cs | flowchart / architecture / uml | Mermaid 流程图、架构图 |
| math | formula / geometry / function | LaTeX 公式、几何图形 |
| ai | neuralnet / trainingcurve / heatmap | 神经网络、训练曲线、热图 |
| chip | architecture / timing / noc | 芯片架构、时序图、NoC 拓扑 |
| physics | formula / banddiagram / field | 物理公式、能带图 |
| network | topology / protocolstack | 网络拓扑、协议栈 |
| general | chart / table / sankey / mindmap | 柱状图/饼图、桑基图、思维导图 |

## 依赖

- Node.js 18+
- Python 3.8+（推荐 Anaconda）
- Python 包：`reportlab`, `matplotlib`, `numpy`, `pymupdf`（可选）
- 可选 CLI：`mermaid-cli`, `d2`, `graphviz`（扩展图表渲染能力）

运行 `node setup.js` 自动检查并安装。

## 架构

```
Agent → index.js (Node.js)
            ├── TDK render → PNG（Node.js CLI / Python matplotlib）
            ├── 构建 report.json
            └── Python ReportLab → PDF
```

- **Node.js**：业务编排、图表渲染调度、JSON 中间件
- **Python ReportLab**：精确 PDF 排版、DPI 换算、中文嵌入

## 目录结构

```
.
├── README.md
├── SKILL.md                    # Kimi Skill 文档
├── index.js                    # 主入口（generatePdf / init）
├── compat.js                   # Node↔Python 桥接层
├── setup.js                    # 环境初始化脚本
├── templates/
│   ├── minimal-report.json     # 最小示例
│   └── report-spec.example.json # 完整研报示例
└── tech-diagram-kit/           # 内嵌图表渲染引擎
    ├── src/                    # 核心代码
    ├── docs/                   # API & 设计文档
    └── test/                   # 测试套件
```

## 许可

MIT
