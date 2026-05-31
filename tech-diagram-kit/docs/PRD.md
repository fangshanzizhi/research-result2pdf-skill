# Tech Diagram Kit - 产品需求文档 (PRD)

## 1. 项目背景与目标

### 1.1 背景
Kimi Code CLI 在生成行业深度研究报告时，需要大量技术原理图、架构图、公式图、网络拓扑图等可视化内容。现有方案仅依赖 matplotlib，覆盖领域有限、样式单一、难以表达复杂技术概念。

### 1.2 目标
构建一个 **跨领域技术图表渲染工具包 (Tech Diagram Kit)**，覆盖化学、物理、数学、计算机、AI、网络、芯片、制造等 10+ 领域，提供统一的声明式 API，优先 Node.js 实现，必要时 Python 回退，最终输出可直接嵌入 PDF 报告的高质量矢量/位图。

---

## 2. 用户与使用场景

| 用户角色 | 使用场景 | 核心需求 |
|---------|---------|---------|
| AI Agent (Kimi CLI) | 自动生成研究报告时调用 | 声明式输入、自动输出图片路径、零人工干预 |
| 技术研究员 | 手动撰写技术文档 | 快速生成专业级原理图，无需学习专业绘图软件 |
| 软件工程师 | 架构文档/方案设计 | 用代码描述架构，自动生成架构图 |

---

## 3. 功能需求

### 3.1 领域覆盖矩阵

| 领域 | 图表类型 | 首选工具 | 回退工具 | 输出格式 |
|------|---------|---------|---------|---------|
| **化学** | 分子结构(2D/3D) | RDKit (Py) | 无 | PNG/SVG |
| **化学** | 反应方程式 | LaTeX/chemfig (Py) | MathJax (Node) | SVG/PNG |
| **物理** | 物理公式 | MathJax (Node) | matplotlib.mathtext (Py) | SVG/PNG |
| **物理** | 能带图/场线图 | matplotlib (Py) | 无 | PNG/PDF |
| **数学** | 数学公式 | MathJax (Node) | matplotlib.mathtext (Py) | SVG/PNG |
| **数学** | 几何图 | tikz (Py) | matplotlib (Py) | PDF/PNG |
| **数学** | 函数图像 | matplotlib (Py) | 无 | PNG/PDF |
| **软件工程** | UML(类/时序/用例) | PlantUML (Node) | Mermaid (Node) | PNG/SVG |
| **软件工程** | 架构图/C4模型 | Mermaid (Node) | D2 (Node) | SVG/PNG |
| **软件工程** | ER图 | Mermaid/DBML | D2 | SVG/PNG |
| **软件工程** | 状态机 | Mermaid | D2 | SVG/PNG |
| **AI/ML** | 神经网络架构 | tikz (Py) | matplotlib (Py) | PDF/PNG |
| **AI/ML** | 训练曲线 | matplotlib (Py) | 无 | PNG |
| **AI/ML** | 注意力热图 | matplotlib (Py) | 无 | PNG |
| **网络** | 网络拓扑 | Graphviz (Node) | D2 (Node) | PNG/SVG |
| **网络** | 协议栈/数据包 | Mermaid | D2 | SVG/PNG |
| **芯片** | 芯片架构框图 | D2 (Node) | tikz (Py) | SVG/PDF |
| **芯片** | 时序图 | tikz-timing (Py) | matplotlib (Py) | PDF/PNG |
| **芯片** | NoC拓扑 | Graphviz (Node) | matplotlib (Py) | PNG |
| **芯片** | 电路图 | schemdraw (Py) | tikz circuit (Py) | SVG/PDF |
| **制造业** | 工艺流程图 | Mermaid (Node) | D2 (Node) | SVG/PNG |
| **制造业** | SPC控制图 | matplotlib (Py) | 无 | PNG |
| **制造业** | 供应链图 | Graphviz (Node) | D2 (Node) | PNG/SVG |
| **通用** | 甘特图 | Mermaid (Node) | PlantUML | PNG/SVG |
| **通用** | 思维导图 | markmap (Node) | 无 | SVG/PNG |
| **通用** | Sankey图 | matplotlib (Py) | D2 | PNG/SVG |
| **通用** | 数据可视化(柱状/饼/折线) | matplotlib (Py) | Vega-Lite (Node) | PNG/SVG |

### 3.2 统一API需求

```javascript
// 统一调用接口（JavaScript）
const { render } = require('tech-diagram-kit');

// 1. 声明式调用 - 指定领域和图表类型
const result = await render({
  domain: 'chemistry',        // 领域: chemistry|physics|math|cs|ai|network|chip|manufacturing|general
  type: 'molecule',           // 图表类型
  format: 'png',              // 输出格式: png|svg|pdf
  width: 800,                 // 像素宽度（位图）或 viewBox 宽度（矢量）
  dpi: 200,                   // 位图DPI
  input: {                    // 领域专用输入参数
    smiles: 'CCO',
    style: 'ball-and-stick'
  },
  outputPath: 'docs/molecule.png'  // 输出路径（可选，默认自动生成）
});

// 返回结果
// result = { success: true, path: 'docs/molecule.png', format: 'png', size: 12345 }

// 2. 通用工具直接调用
const { mermaid, graphviz, mathjax, matplotlib } = require('tech-diagram-kit/renderers');
await mermaid.render('flowchart TD; A-->B;', 'output.png');
await mathjax.render('E = mc^2', 'equation.svg');
```

### 3.3 输入输出规范

- **输入**：声明式配置对象（JSON），或领域专用 DSL 字符串
- **输出**：PNG / SVG / PDF 文件路径
- **错误处理**：统一错误码，包含 `RENDERER_NOT_FOUND`、`DEPENDENCY_MISSING`、`INVALID_INPUT`、`RENDER_FAILED`
- **中间文件**：自动清理，不残留临时文件

---

## 4. 非功能需求

### 4.1 运行环境
- **Node.js**：>= 18.0（优先运行时）
- **Python**：>= 3.9（回退运行时，通过 child_process 调用）
- **操作系统**：Windows / Linux / macOS
- **外部依赖**：可选安装（按需），未安装时自动降级或报错

### 4.2 性能
- 简单图表（Mermaid/MathJax）：< 2s
- 复杂科学绘图（matplotlib）：< 5s
- 化学分子（RDKit）：< 3s
- 并发安全：支持同时渲染多个图表

### 4.3 质量
- 输出图片分辨率 >= 150 DPI
- 中文字体正确渲染（使用系统 SimHei 或 Noto Sans CJK）
- 矢量格式（SVG/PDF）支持无损缩放

---

## 5. 依赖矩阵

| 依赖 | 安装方式 | 用途 | 是否必须 |
|------|---------|------|---------|
| Node.js >= 18 | 系统安装 | 主运行时 | ✅ 必须 |
| @mermaid-js/mermaid-cli | npm i -g | Mermaid 渲染 | ❌ 可选 |
| d2 | 官方安装脚本 | D2 渲染 | ❌ 可选 |
| plantuml | npm i -g / Java | PlantUML | ❌ 可选 |
| graphviz (系统) | 系统包管理器 | Graphviz dot | ❌ 可选 |
| markmap-cli | npm i -g | 思维导图 | ❌ 可选 |
| vega-lite + canvas | npm install | 数据可视化 | ❌ 可选 |
| Python >= 3.9 | 系统/conda | 回退运行时 | ✅ 必须 |
| matplotlib | pip install | 科学绘图 | ❌ 可选 |
| RDKit | conda install | 化学分子 | ❌ 可选 |
| schemdraw | pip install | 电路图 | ❌ 可选 |
| graphviz (Python) | pip install | Python Graphviz | ❌ 可选 |
| pymupdf / reportlab | pip install | PDF 组装 | ❌ 可选 |

---

## 6. 验收标准

- [ ] 支持全部 10 个领域的至少 2 种核心图表类型
- [ ] 提供统一的 JavaScript API，调用方无感知底层实现语言
- [ ] Python 渲染器通过 stdin/stdout JSON 协议与 Node 通信
- [ ] 所有渲染器均可在缺失依赖时给出清晰的安装指引
- [ ] 提供完整的测试用例，覆盖率 > 80%
- [ ] 提供 SKILL.md，可被 Kimi CLI 直接调用
- [ ] 清理中间文件，不污染工作目录
