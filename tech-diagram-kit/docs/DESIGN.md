# Tech Diagram Kit - 架构设计文档

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        统一 API 层 (Node.js)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ 领域接口     │  │ 领域接口     │  │ 领域接口     │  │ 通用接口   │ │
│  │ Chemistry   │  │ Physics     │  │ Network     │  │ General   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘ │
│         └─────────────────┴─────────────────┘                │      │
│                           │                                  │      │
│                   ┌───────▼───────┐              ┌──────────▼────┐ │
│                   │  调度引擎      │              │  工具渲染器    │ │
│                   │  Engine       │              │  (Mermaid等)  │ │
│                   └───────┬───────┘              └─────────────┘ │
│                           │                                       │
│         ┌─────────────────┼─────────────────┐                    │
│         ▼                 ▼                 ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐          │
│  │ Node 渲染器   │ │ Node 渲染器   │ │ Python 适配器     │          │
│  │ (本地进程)    │ │ (本地进程)    │ │ (子进程桥接)      │          │
│  │ mermaid-cli  │ │ d2            │ │ matplotlib       │          │
│  │ plantuml     │ │ graphviz      │ │ rdkit            │          │
│  │ mathjax-node │ │ markmap       │ │ schemdraw        │          │
│  │ vega-lite    │ │               │ │ tikz             │          │
│  └──────────────┘ └──────────────┘ └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   输出文件        │
                    │ PNG / SVG / PDF │
                    └─────────────────┘
```

---

## 2. 模块设计

### 2.1 核心模块 (src/core/)

#### `engine.js` - 调度引擎
- 职责：接收统一 API 调用，路由到正确的渲染器
- 核心逻辑：
  1. 解析 `domain` + `type` → 查找渲染器映射表
  2. 检查目标渲染器依赖是否可用
  3. 如不可用，查找降级方案
  4. 调用渲染器，返回结果

```javascript
// 渲染器注册表
const registry = {
  'chemistry.molecule': { renderer: 'rdkit', fallback: null, lang: 'python' },
  'chemistry.equation': { renderer: 'latex', fallback: 'mathjax', lang: 'node' },
  'physics.formula':    { renderer: 'mathjax', fallback: 'matplotlib', lang: 'node' },
  'cs.uml':             { renderer: 'plantuml', fallback: 'mermaid', lang: 'node' },
  'cs.architecture':    { renderer: 'mermaid', fallback: 'd2', lang: 'node' },
  'ai.neuralnet':       { renderer: 'tikz', fallback: 'matplotlib', lang: 'python' },
  'ai.trainingcurve':   { renderer: 'matplotlib', fallback: null, lang: 'python' },
  'network.topology':   { renderer: 'graphviz', fallback: 'd2', lang: 'node' },
  'chip.architecture':  { renderer: 'd2', fallback: 'tikz', lang: 'node' },
  'chip.circuit':       { renderer: 'schemdraw', fallback: null, lang: 'python' },
  'manufacturing.process': { renderer: 'mermaid', fallback: null, lang: 'node' },
  'general.sankey':     { renderer: 'matplotlib', fallback: 'd2', lang: 'python' },
  // ...
};
```

#### `adapter.js` - Python 适配器
- 职责：Node.js 调用 Python 渲染器的统一桥接
- 通信协议：stdin 输入 JSON，stdout 输出 JSON

```javascript
// adapter.js 核心逻辑
async function callPython(renderer, payload) {
  const scriptPath = path.join(__dirname, '../renderers/py', `${renderer}.py`);
  const child = spawn(pythonExe, [scriptPath]);
  
  // 发送输入
  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();
  
  // 接收输出
  let output = '';
  child.stdout.on('data', (d) => output += d);
  
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  if (exitCode !== 0) throw new Error(`Python renderer ${renderer} failed`);
  
  return JSON.parse(output);
}
```

#### `dependency-check.js` - 依赖检查
- 检查 CLI 工具是否安装（`which mmdc` / `which d2`）
- 检查 Python 包是否可用（`python -c "import matplotlib"`）
- 返回可用性状态和安装指引

---

### 2.2 渲染器层 (src/renderers/)

#### Node.js 渲染器 (src/renderers/node/)

每个渲染器实现统一接口：

```javascript
class BaseRenderer {
  async checkDependency() { /* 返回 { available: boolean, installCmd: string } */ }
  async render(input, options) { /* 返回 { path, format } */ }
  getSupportedFormats() { return ['png', 'svg']; }
}
```

| 文件 | 工具 | 输入 | 输出 |
|------|------|------|------|
| `mermaid.js` | `mmdc` CLI | Mermaid DSL 字符串 | PNG/SVG/PDF |
| `d2.js` | `d2` CLI | D2 DSL 字符串 | SVG/PNG |
| `plantuml.js` | `plantuml` CLI | PlantUML DSL 字符串 | PNG/SVG |
| `graphviz.js` | `dot` CLI | DOT 字符串 | PNG/SVG/PDF |
| `mathjax.js` | `mathjax-node` / puppeteer | LaTeX 公式字符串 | SVG/PNG |
| `markmap.js` | `markmap-cli` | Markdown 大纲 | SVG/HTML |
| `vegalite.js` | `vega-lite` + `canvas` | Vega-Lite JSON spec | PNG/SVG |

#### Python 渲染器 (src/renderers/py/)

每个 Python 脚本实现统一接口：

```python
#!/usr/bin/env python3
import sys, json

def render(payload: dict) -> dict:
    """
    payload = {
        "input": { ... },      # 领域专用输入
        "format": "png",       # 输出格式
        "outputPath": "...",   # 输出路径
        "width": 800,
        "dpi": 200
    }
    return {
        "success": True,
        "path": "...",
        "format": "png",
        "size": 12345
    }
    """
    pass

if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result))
```

| 文件 | 工具 | 输入 | 输出 |
|------|------|------|------|
| `matplotlib.py` | matplotlib | 绘图配置 JSON | PNG/PDF |
| `rdkit.py` | RDKit | SMILES / Mol 字符串 | PNG/SVG |
| `schemdraw.py` | schemdraw | 电路描述 JSON | SVG/PDF |
| `tikz.py` | tikz + pdflatex | tikz 代码字符串 | PDF/PNG |
| `latex_math.py` | matplotlib.mathtext | LaTeX 公式 | PNG |

---

### 2.3 领域接口层 (src/domains/)

为每个领域提供语义化 API，屏蔽底层渲染器细节：

```javascript
// src/domains/chemistry.js
class ChemistryDomain {
  async molecule(smiles, options = {}) {
    return await engine.render({
      domain: 'chemistry',
      type: 'molecule',
      input: { smiles, ...options },
      ...options
    });
  }
  
  async reaction(equation, options = {}) {
    // 化学方程式 → LaTeX → MathJax/matplotlib
    const latex = chemEquationToLatex(equation);
    return await engine.render({
      domain: 'chemistry',
      type: 'equation',
      input: { latex },
      ...options
    });
  }
}
```

---

## 3. 数据治理

### 3.1 目录结构

```
tech-diagram-kit/
├── src/
│   ├── core/           # 引擎、适配器、依赖检查
│   ├── renderers/
│   │   ├── node/       # Node.js 渲染器
│   │   └── py/         # Python 渲染器
│   ├── domains/        # 领域接口
│   └── utils/          # 工具函数
├── test/
│   ├── unit/           # 单元测试
│   ├── integration/    # 集成测试
│   └── fixtures/       # 测试输入数据
├── docs/
│   ├── PRD.md          # 本文件
│   ├── DESIGN.md       # 本文件
│   ├── API.md          # API 参考
│   └── examples/       # 各领域示例代码
├── dist/               # 构建输出（npm publish）
├── temp/               # 运行时临时文件（.gitignore）
├── package.json        # Node 依赖
├── pyproject.toml      # Python 依赖
├── README.md           # 用户手册
└── SKILL.md            # Kimi CLI Skill 入口
```

### 3.2 临时文件管理

- 所有中间文件写入 `temp/` 目录
- 渲染完成后自动清理（除非 `keepTemp: true`）
- `temp/` 在 `.gitignore` 中

### 3.3 输出文件规范

- 用户指定 `outputPath` 时，直接输出到目标路径
- 未指定时，输出到 `docs/` 目录，命名格式：`{domain}_{type}_{timestamp}.{format}`
- 文件大小限制：PNG < 10MB，SVG < 5MB

---

## 4. 错误处理与降级策略

### 4.1 错误码体系

```javascript
const ErrorCode = {
  DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',   // 依赖未安装
  INVALID_INPUT: 'INVALID_INPUT',             // 输入格式错误
  RENDER_FAILED: 'RENDER_FAILED',             // 渲染过程出错
  TIMEOUT: 'TIMEOUT',                         // 渲染超时
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',   // 输出格式不支持
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',       // 图表类型不支持
};
```

### 4.2 自动降级流程

```
用户请求 → 查注册表 → 主渲染器可用?
              │
       是 → 调用主渲染器
       否 → 查 fallback → fallback 可用?
              │
       是 → 调用 fallback，warning 日志
       否 → 报错 DEPENDENCY_MISSING，附带安装指引
```

### 4.3 安装指引模板

```javascript
{
  code: 'DEPENDENCY_MISSING',
  renderer: 'mermaid',
  message: 'Mermaid CLI (mmdc) 未安装',
  installGuide: {
    windows: 'npm install -g @mermaid-js/mermaid-cli',
    macos: 'npm install -g @mermaid-js/mermaid-cli',
    linux: 'npm install -g @mermaid-js/mermaid-cli'
  }
}
```

---

## 5. Kimi Skill 集成

### 5.1 SKILL.md 设计

```yaml
---
name: tech-diagram-kit
description: 跨领域技术图表渲染工具包。支持化学分子、物理公式、数学几何、UML架构、神经网络、网络拓扑、芯片架构、电路图、工艺流程图等 10+ 领域的自动化图表生成。
user-invocable: true
---

## 使用方法

当用户要求绘制技术原理图、架构图、公式图、流程图等时，调用本 Skill：

```javascript
const tdk = require('tech-diagram-kit');

// 化学分子
await tdk.chemistry.molecule('CCO', { format: 'png' });

// 物理公式
await tdk.physics.formula('E = mc^2', { format: 'svg' });

// UML 类图
await tdk.cs.umlClass({
  classes: [{ name: 'User', attrs: ['+name', '+email'] }],
  relations: [{ from: 'User', to: 'Order', type: '1:N' }]
});

// 网络拓扑
await tdk.network.topology({
  nodes: [{ id: 'router1', label: '核心路由器' }],
  edges: [{ from: 'router1', to: 'switch1' }]
});
```
```

### 5.2 与 industry-deep-research Skill 的协作

```
industry-deep-research Skill 生成报告内容
         │
         ▼ 需要插入技术原理图
    tech-diagram-kit Skill
         │
         ▼ 返回图片路径
    嵌入 PDF / Markdown
```

---

## 6. 关键技术决策

### 决策 1：为什么 Node.js 优先？
- Kimi CLI 的 Skill 系统基于 Node.js（JavaScript/TypeScript）
- npm 生态更适合 CLI 工具的封装和调用
- 统一的事件循环和异步模型

### 决策 2：为什么 Python 通过子进程桥接？
- Python 在科学计算领域不可替代（matplotlib、RDKit、schemdraw）
- 子进程 JSON 通信是最轻量的集成方式，无需 HTTP 服务
- 每个渲染器独立进程，避免 GIL 和内存泄漏问题

### 决策 3：为什么用 SVG 作为中间格式？
- SVG 是矢量格式，可无损转为 PNG/PDF
- 大多数现代渲染工具原生支持 SVG 输出
- ReportLab 可通过 `svglib` 直接嵌入 SVG

### 决策 4：为什么不做纯浏览器方案？
- 需要 headless Chrome/Puppeteer，环境依赖重
- 启动时间长（>1s），不适合批量渲染
- 仅在 MathJax 等少数场景使用
