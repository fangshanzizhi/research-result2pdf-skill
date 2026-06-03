# Tech Diagram Kit (TDK)

跨领域技术图表渲染工具包。支持化学、物理、数学、计算机、AI、网络、芯片、制造等 **9 大领域**、**33+ 图表类型**的自动化生成。

## 核心特性

- **声明式 API**：一行代码生成专业图表
- **沙盒隔离**：`.pdf-reporter/` 自动管理全部依赖，零系统污染
- **自动依赖安装**：首次调用自动下载安装 d2/graphviz/rdkit 等全部工具
- **Node.js 优先**：Skill 级集成，支持 Kimi CLI 直接调用
- **Python 回退**：科学计算图表无缝降级到 Python 渲染
- **统一输出**：PNG / SVG / PDF 格式统一处理

## 快速开始

```bash
# 安装 Node 依赖
npm install

# 检查可用渲染器
npm run check-deps

# 运行测试
npm test
```

```javascript
const tdk = require('tech-diagram-kit');

// 化学分子
await tdk.chemistry.molecule('CCO');

// 物理公式
await tdk.physics.formula('E = mc^2');

// 神经网络架构
await tdk.ai.neuralNet([784, 256, 128, 10]);

// UML 类图
await tdk.cs.uml({
  classes: [{ name: 'User', attrs: ['+name', '+email'] }],
  relations: [{ from: 'User', to: 'Order', type: '1:N' }]
});

// 网络拓扑
await tdk.network.topology({
  nodes: [{ id: 'R1', label: 'Router' }],
  edges: [{ from: 'R1', to: 'S1' }]
});
```

## 支持领域

| 领域 | 图表类型 | 渲染引擎 |
|------|---------|---------|
| **化学** | 分子结构(2D)、反应方程式 | RDKit, LaTeX |
| **物理** | 公式、能带图、场线图、电路图 | MathJax, matplotlib, schemdraw |
| **数学** | 公式、几何图、函数图像 | MathJax, matplotlib |
| **计算机** | UML、架构图、ER图、状态机、流程图、甘特图 | Mermaid, PlantUML, D2 |
| **AI/ML** | 神经网络、训练曲线、热图、混淆矩阵、Pipeline | matplotlib, Mermaid |
| **网络** | 拓扑图、协议栈、数据包结构 | Graphviz, Mermaid |
| **芯片** | 架构框图、时序图、NoC拓扑、电路图 | D2, matplotlib, schemdraw |
| **制造业** | 工艺流程图、SPC控制图、供应链图 | Mermaid, matplotlib, Graphviz |
| **通用** | 思维导图、Sankey图、柱状/饼/折线图、流程图、架构图、公式、网络拓扑 | markmap, matplotlib, Vega-Lite, Mermaid, D2, Graphviz |

### 通用别名（general）

为方便使用，`general` 领域提供以下常用图表的快捷入口：

| 类型 | 对应引擎 | 输入格式 |
|------|---------|---------|
| `general.flowchart` | Mermaid → D2 fallback | D2/Mermaid DSL 字符串 |
| `general.architecture` | D2 → Mermaid fallback | D2 DSL 字符串 |
| `general.formula` | MathJax → LaTeX fallback | LaTeX 字符串（无需 `$`） |
| `general.network` | Graphviz → D2 fallback | Graphviz DOT 字符串 |
| `general.process` | Mermaid → D2 fallback | D2/Mermaid DSL 字符串 |

## 架构

```
tech-diagram-kit/
├── src/
│   ├── core/         # 调度引擎 + Python 适配器 + 沙盒管理 + 依赖检查
│   ├── renderers/    # 渲染器实现 (Node.js + Python)
│   ├── domains/      # 领域语义化接口
│   └── utils/        # 路径、错误处理工具
├── test/             # 单元测试 + 集成测试
├── docs/             # 文档 + 示例
└── temp/             # 临时文件 (.gitignore)
```

## 沙盒依赖管理

TDK 采用**沙盒优先**策略，在项目根目录 `.pdf-reporter/` 下创建隔离环境：

### 自动安装的依赖

| Tier | 类型 | 包/工具 | 安装方式 |
|------|------|---------|---------|
| 0 | Python | reportlab, matplotlib, numpy, pymupdf | pip（沙盒 venv） |
| 1 | Python | schemdraw, rdkit | pip（沙盒 venv） |
| 2 | Node.js | mathjax-node | npm（沙盒 node_modules） |
| 3 | CLI | mermaid-cli, d2, graphviz | npm / GitHub Release / GitLab Release |

### 手动安装（备用）

如沙盒自动安装失败，可手动安装：

```bash
# Mermaid
npm install -g @mermaid-js/mermaid-cli

# D2
curl -fsSL https://d2lang.com/install.sh | sh -s --

# PlantUML
npm install -g plantuml

# Graphviz (系统级)
# Windows: choco install graphviz
# macOS:  brew install graphviz
# Linux:  sudo apt install graphviz

# 思维导图
npm install -g markmap-cli

# Python 包
pip install matplotlib numpy schemdraw reportlab pymupdf
conda install -c conda-forge rdkit
```

## 渲染器修复记录

| 渲染器 | 修复内容 |
|--------|---------|
| d2.js | 使用 `findInSandbox()` 查找沙盒 bin/ 路径 |
| mermaid.js | 使用 `findInSandbox()` 查找沙盒 mmdc；超时延长到 60s |
| graphviz.js | 使用 `findInSandbox()` 查找沙盒 dot；安装后自动 `dot -c` |
| rdkit.py | sys.path 清理避免脚本名冲突；stderr 保护；stdout 绕过；width 兜底 |
| schemdraw.py | sys.path 清理；matplotlib Agg backend；字符串输入支持 |
| latex_math.py | 字符串输入支持 |

## 许可证

MIT
