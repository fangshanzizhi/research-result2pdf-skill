# PDF Reporter Skill

将研究内容自动生成为带图表的专业 PDF 报告的 Kimi CLI Skill。

## 功能

- **自动图表渲染**：支持 **9 大技术领域**、**33+ 图表类型**（流程图、公式、神经网络、热图、NoC 架构、分子结构、电路图、时序图等）
- **中文原生支持**：PDF 使用 SimHei 字体，matplotlib 中文显示正常
- **DPI 精确控制**：200 DPI 图表嵌入，文字与图比例协调
- **沙盒自动安装**：`.pdf-reporter/` 隔离环境，自动安装全部 10 个依赖（含 d2/graphviz/rdkit 自动下载）

## 快速开始

### 开箱即用（推荐）

```bash
git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
cd research-result2pdf-skill
npm install
```

`npm install` 自动完成全部初始化：
1. 安装 Node.js 依赖（jest 等）
2. 将 skill 链接到 `~/.kimi-code/skills/pdf-reporter/`
3. 创建 `.pdf-reporter/` 沙盒并安装全部 10 个依赖（Python venv + Node 包 + CLI 二进制）

> 首次初始化约需 **2-5 分钟**（下载 Python 包和 CLI 工具），请耐心等待。后续调用秒开。

### 直接使用

```javascript
const reporter = require('./index.js');
// 或安装后通过 skill 路径引用
const reporter = require('skill/pdf-reporter');

const result = await reporter.generatePdf({
  context: "研究报告主题",
  struct: [ /* 章节结构 */ ],
  desc: [ /* 图表定义 */ ]
});
```

### CLI 命令行

```bash
# 通过 report.json 生成 PDF
npx pdf-reporter templates/minimal-report.json output.pdf

# 或使用已安装的 skill 路径
node bin/cli.js templates/minimal-report.json output.pdf
```

### Agent 调用（数据驱动）

Agent **不需要写 JS 文件**，直接组装 `{context, struct, desc}` 三个字段，调用一行 API：

```javascript
const reporter = require('skill/pdf-reporter');

const result = await reporter.generatePdf({
  context: "AI芯片高速互联技术深度报告",
  struct: [ /* 章节结构与图表占位符 */ ],
  desc: [ /* 图表定义 */ ]
});

// result = { success: true, path: "reports/2026-05-31_report.pdf", size, pages, images }
```

完整的数据格式和图表类型速查表见 `SKILL.md`。

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
| **general** | chart / table / sankey / mindmap / **flowchart** / **architecture** / **formula** / **network** / **process** | 柱状图/饼图、桑基图、思维导图、流程图、架构图、公式、网络拓扑 |
| **cs** | flowchart / architecture / uml / er / statemachine / gantt | Mermaid/D2 流程图、架构图 |
| **math** | formula / geometry / function | LaTeX 公式、几何图形 |
| **ai** | neuralnet / trainingcurve / heatmap / confusion / pipeline | 神经网络、训练曲线、热图 |
| **chip** | architecture / timing / noc / **circuit** | 芯片架构、时序图、NoC 拓扑、电路图 |
| **physics** | formula / banddiagram / field / **circuit** | 物理公式、能带图、电路图 |
| **network** | topology / protocolstack / packet | 网络拓扑、协议栈 |
| **chemistry** | **molecule** / equation | 分子结构（SMILES）、反应方程式 |
| **manufacturing** | process / spc / supplychain | 工艺流程图、SPC 控制图 |

> **通用别名**：`general.flowchart`、`general.architecture`、`general.formula`、`general.network`、`general.process` 可直接使用，无需记忆具体领域。

## 依赖

- Node.js 18+
- Python 3.8+（沙盒自动安装，无需系统环境）

运行 `node setup.js` 自动检查并安装（首次调用 `generatePdf()` 也会自动触发）。

## 架构

```
Agent → index.js (Node.js)
            ├── TDK render → PNG（Node.js CLI / Python matplotlib）
            │       └── 沙盒优先：.pdf-reporter/venv + bin/
            ├── 构建 report.json
            └── Python ReportLab → PDF
```

- **Node.js**：业务编排、图表渲染调度、JSON 中间件
- **Tech Diagram Kit**：跨领域图表渲染引擎，支持 33+ 类型
- **沙盒环境**：`.pdf-reporter/` 隔离 Python venv、Node 包、CLI 二进制
- **Python ReportLab**：精确 PDF 排版、DPI 换算、中文嵌入

## 目录结构

```
.
├── README.md
├── SKILL.md                    # Kimi Skill 文档（Agent 使用指南）
├── index.js                    # 主入口（generatePdf / init）
├── compat.js                   # Node↔Python 桥接层
├── setup.js                    # 环境初始化脚本
├── templates/
│   ├── minimal-report.json     # 最小示例
│   └── report-spec.example.json # 完整研报示例
├── reports/                    # 报告生成脚本
│   └── generate_full_chart_test.js  # 全图表类型测试
└── tech-diagram-kit/           # 内嵌图表渲染引擎
    ├── src/                    # 核心代码（引擎 + 渲染器 + 领域接口）
    │   ├── core/               # 调度引擎、沙盒管理、依赖检查
    │   ├── renderers/          # Node.js + Python 渲染器
    │   ├── domains/            # 领域语义化接口
    │   └── unit_test/          # 单元测试
    ├── test/                   # 集成测试
    └── docs/                   # API & 设计文档
```

## 测试

```bash
# 单元测试（tech-diagram-kit）
cd tech-diagram-kit && npm test

# 全图表类型测试
node reports/generate_full_chart_test.js
```

- **单元测试**：96/96 通过
- **全图表集成测试**：10/10 通过（chart/flowchart/architecture/neuralnet/formula/circuit/timing/molecule/network/process）

## 许可

MIT
