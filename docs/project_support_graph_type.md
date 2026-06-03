# PDF Reporter Skill — 支持图表类型清单

> 来源：`index.js` 中 `listChartTypes()` 的完整输出，以及 `SKILL.md` 中的图表模板。  
> Agent 在组织 `desc` 数组时，从以下清单中选择最直观的图表类型。

---

## 一、按技术领域分类

### 1. `cs` — 计算机科学 / 软件工程

| chartType | 说明 | 推荐 layout | input 示例 |
|-----------|------|-------------|------------|
| `flowchart` | 流程图（Mermaid） | `fullwidth` | `{ dsl: "flowchart LR\nA[输入] --> B[处理] --> C[输出]" }` |
| `architecture` | 系统架构图（Mermaid） | `fullwidth` | `{ dsl: "graph TD\nA-->B" }` |

> `dsl` 使用 Mermaid 语法。若 `mermaid-cli` 未安装，会 fallback 到 `d2`（如 `d2` 也未装则渲染失败，占位符处显示文字）。

---

### 2. `math` — 数学

| chartType | 说明 | 推荐 layout | input 示例 |
|-----------|------|-------------|------------|
| `formula` | LaTeX 公式 | `inline` | `{ latex: "\\alpha(f) = \\alpha_0 \\sqrt{f} + \\alpha_{diel} f" }` |
| `function` | 函数图像 | `fullwidth` | `{ func: "sin(x)", range: [-3.14, 3.14] }` |

> **注意**：LaTeX 公式不要加 `$` 包裹，直接写内容即可。`layout: "inline"` 适合公式（55% 宽度）。

---

### 3. `ai` — 人工智能

| chartType | 说明 | 推荐 layout | input 示例 |
|-----------|------|-------------|------------|
| `neuralnet` | 神经网络架构图 | `standalone` | `{ layers: [5, 8, 6, 3], title: "多层感知机架构" }` |
| `trainingcurve` | 训练曲线 | `fullwidth` | `{ model: "resnet50", epochs: 90, batch_size: 256 }` |
| `heatmap` | 热图 / 混淆矩阵 | `inline` / `fullwidth` | `{ data: [[0.8,0.1],[0.1,0.9]], labels: ["A","B"] }` |

> `layers` 数组表示每层的神经元数量。`standalone` 布局适合复杂架构图（独占一页）。  
> `chartType: "confusion"` 用法与 `heatmap` 相同，自动标注百分比。

---

### 4. `chip` — 芯片 / 硬件

| chartType | 说明 | 推荐 layout | input 示例 |
|-----------|------|-------------|------------|
| `noc` | NoC 网络拓扑图 | `fullwidth` | `{ topology: "mesh", nodes: ["C00","C01",...], size: 4 }` |
| `timing` | 时序图 | `fullwidth` | `{ signals: [{name:"CLK", wave:"010101"}, {name:"DATA", wave:"0.1.0."}] }` |

---

### 5. `general` — 通用

| chartType | 说明 | 推荐 layout | input 示例 |
|-----------|------|-------------|------------|
| `chart` | 柱状图 / 折线图 / 饼图 | `fullwidth` | `{ chartType: "bar", labels: ["Q1","Q2"], values: [120,190] }` |
| `table` | 数据表格（渲染为图片） | `fullwidth` | `{ headers: ["企业","份额"], rows: [["A","50%"]] }` |
| `sankey` | 桑基图 | `fullwidth` | `{ nodes: ["收入","成本","利润"], flows: [{source:"收入",target:"成本",value:60}] }` |

> `chart` 的 `chartType` 子类型可选：`"bar"` / `"line"` / `"pie"`。  
> `struct` 中也可用原生 `table` 类型（非 `diagram`），区别在于原生 `table` 直接嵌入 PDF，`diagram`+`chartType: "table"` 会生成图片后嵌入。

---

## 二、布局选项（layout）

| layout | 宽度 | 适用场景 |
|--------|------|----------|
| `fullwidth` | 100% | 大多数图表（默认） |
| `inline` | 55% | 公式、小图、热图 |
| `halfwidth` | 48% | 两图并排 |
| `standalone` | 95% + 独占一页 | 复杂架构图（神经网络、大型流程图） |

---

## 三、快速选择指南

| 你想表达的内容 | 推荐 domain + chartType | 推荐 layout |
|----------------|------------------------|-------------|
| 工作流程、步骤流转 | `cs` + `flowchart` | `fullwidth` |
| 系统模块关系 | `cs` + `architecture` | `fullwidth` |
| 数学公式 | `math` + `formula` | `inline` |
| 函数图像 | `math` + `function` | `fullwidth` |
| 神经网络结构 | `ai` + `neuralnet` | `standalone` |
| 训练过程指标 | `ai` + `trainingcurve` | `fullwidth` |
| 分类准确率矩阵 | `ai` + `heatmap` | `inline` / `fullwidth` |
| 芯片网络拓扑 | `chip` + `noc` | `fullwidth` |
| 时钟/信号时序 | `chip` + `timing` | `fullwidth` |
| 数据对比（柱状/折线/饼） | `general` + `chart` | `fullwidth` |
| 数据表格 | `general` + `table` | `fullwidth` |
| 流量/资金流转 | `general` + `sankey` | `fullwidth` |

---

## 四、注意事项

1. **Agent 不需要写 JS 文件** — 直接组装 `context/struct/desc` 数据结构调用 API 即可。
2. **LaTeX 公式不要加 `$` 包裹** — `latex: "E = mc^2"` 即可。
3. **图表顺序** — 以 `struct` 中 `ref` 引用的顺序为准。
4. **文字长度** — `paragraph` 建议 200-300 字以内，避免 PDF 排版溢出。
5. **每页图表** — 建议不超过 2 张，`standalone` 独占一页。
6. **中文字体** — 使用系统 SimHei，如缺失需设置 `TDK_FONT_PATH` 环境变量。
