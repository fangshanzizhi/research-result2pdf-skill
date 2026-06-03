# PDF Reporter Skill — 项目总结

> **定位**：自动PDF研究报告生成器。AI Agent 只需按约定组装 `{context, struct, desc}` 三个字段的数据结构，Skill 自动完成图表渲染、PDF 排版与文件输出，最终交付一份专业 A4 格式 PDF 研究报告。

---

## 一、核心能力

| 能力 | 说明 |
|------|------|
| **零模板编码** | Agent 无需编写 LaTeX、HTML 或操作底层文件系统。纯数据结构驱动，一行 API 调用即可生成 PDF。 |
| **图表自动化** | 内置 5 大技术领域、12 种图表类型，自动调用 Tech Diagram Kit（TDK）渲染为高清 PNG 后嵌入 PDF。 |
| **中文原生支持** | 内置 SimHei 字体回退，默认支持中文封面、正文与图表图注，无需额外配置。 |
| **跨语言架构** | Node.js 负责业务编排与 TDK 调用，Python（ReportLab）负责物理排版，通过 JSON 文件解耦通信。 |
| **PDF 追加模式** | 若目标文件已存在，可将新报告追加到原文件末尾（插入分隔页 + 时间戳），而非直接覆盖。 |

---

## 二、Agent 调用流程

```
Step 1: 组装数据
  context — 报告主题（一句话，用于封面标题和默认文件名）
  struct  — 报告结构数组（cover/heading/paragraph/bullet/summary/table/diagram/pagebreak）
  desc    — 图表描述数组（每张 diagram 占位符对应的渲染规格）
    ↓
Step 2: 调用 API
  const result = await reporter.generatePdf({ context, struct, desc, outputPath? })
    ↓
Step 3: 获取结果
  result = { success: true, path, size, pages, images }
```

### 典型调用示例

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
    { type: "heading", text: "关键结论", level: 1 },
    { type: "bullet", text: "CPO技术预计2027年规模部署" },
  ],

  desc: [
    {
      id: "fig_flow",
      domain: "cs",
      chartType: "flowchart",
      input: { dsl: "flowchart LR\nA[电信号] --> B[激光器] --> C[光纤]" },
      caption: "光模块光电转换流程"
    }
  ]
});
```

---

## 三、输出规范

| 场景 | 行为 |
|------|------|
| 默认路径 | `./pdf/{sanitizeFilename(context)}.pdf`，自动处理重名（`_1`、`_2` 递增） |
| 自定义路径 | 通过 `outputPath` 指定任意绝对或相对路径，自动级联创建父目录 |
| 文件已存在 | 若 `pymupdf` 可用 → **追加**到新文件末尾；若不可用 → 回退到 `uniquePdfPath` 生成新文件 |

---

## 四、技术架构

```text
┌─────────────────────────────────────────────┐
│  Agent 调用层                                │
│  reporter.generatePdf({context, struct, desc})│
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  编排层 (Node.js) — index.js                │
│  参数校验 → 环境检查 → 创建临时目录          │
│  → TDK 渲染图表 → 组装 report.json          │
│  → Python pdf_assembler.py → 读取页数 → 返回│
└─────────────────────┬───────────────────────┘
                      │ JSON 文件 + 子进程
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  渲染层       │ │  桥接层       │ │  排版层       │
│  Tech Diagram │ │   compat.js  │ │  Python       │
│     Kit       │ │ runPython    │ │ pdf_assembler │
│  tdk.render() │ │ pyPath       │ │  ReportLab    │
└──────────────┘ └──────────────┘ └──────────────┘
```

| 模块 | 职责 |
|------|------|
| `index.js` | 公开 API：`generatePdf`、`init`、`listChartTypes`、`checkReady`；业务编排 |
| `compat.js` | Python 解释器检测、版本验证、命令行安全编码、带超时的子进程封装 |
| `setup.js` | 环境一键检查/安装：Python 包、Node 包、CLI 工具、目录创建；`--check-only` 模式 |
| `tech-diagram-kit/` | 跨领域技术图表渲染工具包，支持 Mermaid、Matplotlib、LaTeX 等 |

---

## 五、工程化增强（本次迭代新增）

1. **PDF 追加逻辑（FR-007）**
   - 检测 `outputPath` 是否存在，存在时通过 `pymupdf`（fitz）合并新旧 PDF
   - 合并时插入分隔页（含"追加报告"标记和时间戳）
   - 临时文件 + `shutil.move` 原子替换，避免写入中途损坏原文件
   - `pymupdf` 不可用时自动回退到 `uniquePdfPath`

2. **安全加固**
   - `mergePdfAppend` 中所有变量通过 `sys.argv` 数组参数传入 Python，消除命令注入
   - 页数读取通过数组参数传路径，消除单引号转义崩溃
   - `runPythonExpr` 复用 `runPython`（`spawn` + 数组参数），废弃 `execSync` 手动拼接

3. **资源管理**
   - `workDir` 和 `tempPdfPath` 均在 `finally` 块中强制清理，异常路径不泄漏
   - 追加前检查目标文件大小，空文件视为不存在直接覆盖

4. **完整测试体系**
   - 8 个测试套件、88 条用例，100% 通过
   - 单元测试（mock 隔离）+ 集成测试（真实 Python 环境，环境不可用时自动 skip）
   - 覆盖率：Statements 71.57%，Branches 65.1%，Functions 80.64%

---

## 六、适用场景

- 投研报告、技术调研报告、产业分析报告的自动生成
- 带图表的数据分析结论导出
- 多轮对话后整理结构化内容并导出为 PDF
- 任何需要将 "文字 + 图表" 整合为专业 PDF 的 Agent 工作流
