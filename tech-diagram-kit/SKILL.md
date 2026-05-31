---
name: tech-diagram-kit
description: >
  跨领域技术图表渲染工具包。输入任意领域的技术描述，自动生成对应的专业图表。
  支持化学分子、物理公式、数学几何、UML架构、神经网络、网络拓扑、芯片架构、电路图、
  工艺流程图等 10+ 领域、30+ 图表类型。优先使用 Node.js 渲染器，必要时自动降级到 Python。
user-invocable: true
---

## 触发条件

当用户要求以下任何内容时，调用本 Skill：
- "画一个...图"
- "生成...架构图/流程图/拓扑图"
- "绘制...公式/分子/电路"
- "做一张...示意图"
- 任何涉及可视化技术概念的需求

## 使用方式

### 1. 通过领域接口调用（推荐）

```javascript
const tdk = require('tech-diagram-kit');

// 根据用户请求的领域选择对应接口

// 化学
await tdk.chemistry.molecule('CCO', { format: 'png' });
await tdk.chemistry.reaction('2H_2 + O_2 \\rightarrow 2H_2O');

// 物理
await tdk.physics.formula('\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}');
await tdk.physics.bandDiagram({ conductionBand: [...], valenceBand: [...] });

// 数学
await tdk.math.formula('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}');
await tdk.math.functionPlot([
  { expr: 'np.sin(x)', label: 'sin(x)', color: 'blue' },
  { expr: 'np.cos(x)', label: 'cos(x)', color: 'red' }
], { xmin: -6, xmax: 6 });

// 计算机/软件工程
await tdk.cs.uml({
  classes: [
    { name: 'User', attrs: ['+id', '+name'], methods: ['+login()'] },
    { name: 'Order', attrs: ['+orderId', '+total'] }
  ],
  relations: [
    { from: 'User', to: 'Order', type: '1:N', label: 'places' }
  ]
}, { kind: 'class' });

await tdk.cs.architecture({
  dsl: `flowchart TD\n  Client --> API --> DB`
});

await tdk.cs.flowchart({
  dsl: `flowchart TD\n  Start --> Process --> Decision -->|Yes| End\n  Decision -->|No| Process`
});

// AI/ML
await tdk.ai.neuralNet([784, 256, 128, 10], {
  layerNames: ['Input', 'Hidden1', 'Hidden2', 'Output']
});

await tdk.ai.trainingCurve({
  epochs: [1,2,3,...],
  trainLoss: [1.0, 0.8, 0.6, ...],
  valLoss: [1.1, 0.85, 0.65, ...]
});

await tdk.ai.heatmap([[0.8, 0.1], [0.2, 0.9]], ['A', 'B']);

// 网络
await tdk.network.topology({
  nodes: [
    { id: 'core', label: '核心路由器', shape: 'ellipse' },
    { id: 'agg1', label: '汇聚交换机' },
    { id: 'agg2', label: '汇聚交换机' }
  ],
  edges: [
    { from: 'core', to: 'agg1', label: '10G' },
    { from: 'core', to: 'agg2', label: '10G' }
  ]
});

await tdk.network.protocolStack({
  layers: [
    { name: '应用层', protocols: ['HTTP', 'DNS'] },
    { name: '传输层', protocols: ['TCP', 'UDP'] },
    { name: '网络层', protocols: ['IP', 'ICMP'] },
    { name: '链路层', protocols: ['以太网'] },
  ]
});

// 芯片
await tdk.chip.architecture({
  dsl: `direction: right\nCPU --> Interconnect --> Memory\nGPU --> Interconnect`
});

await tdk.chip.noc(4);  // 4x4 Mesh NoC

await tdk.chip.circuit({ circuitType: 'basic' });

// 制造业
await tdk.manufacturing.process({
  steps: [
    { id: 'A', name: '原料入库', next: 'B' },
    { id: 'B', name: 'CNC加工', next: 'C' },
    { id: 'C', name: '质检', next: 'D' },
    { id: 'D', name: '包装出货', next: null }
  ]
});

await tdk.manufacturing.spc({
  samples: [1,2,3,...30],
  values: [10.1, 10.3, 9.8, ...],
  ucl: 11.5, lcl: 8.5, cl: 10.0
});

// 通用
await tdk.general.mindmap(`
# 技术架构
## 前端
- React
- Vue
## 后端
- Node.js
- Go
`);

await tdk.general.chart({
  chartType: 'bar',
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  values: [120, 190, 150, 220]
});
```

### 2. 通过底层渲染器直接调用（高级）

```javascript
const { renderers } = require('tech-diagram-kit');

// 直接调用 Mermaid
await renderers.mermaid.render({
  input: { code: 'flowchart TD; A-->B;' },
  format: 'svg',
  outputPath: 'output/flow.svg'
});

// 直接调用 Graphviz
await renderers.graphviz.render({
  input: { code: 'digraph G { A -> B; }' },
  format: 'png',
  outputPath: 'output/graph.png'
});
```

### 3. 通用渲染接口（最灵活）

```javascript
const { render } = require('tech-diagram-kit');

const result = await render({
  domain: 'cs',
  type: 'flowchart',
  input: { code: 'flowchart TD; Start --> End' },
  format: 'svg',
  outputPath: 'docs/flowchart.svg'
});
// result = { success: true, path: 'docs/flowchart.svg', format: 'svg', size: 1234 }
```

## 错误处理

当渲染失败时，捕获 TdkError 获取错误码和安装指引：

```javascript
const { TdkError, ErrorCode } = require('tech-diagram-kit/src/utils/errors');

try {
  await tdk.chemistry.molecule('CCO');
} catch (e) {
  if (e.code === ErrorCode.DEPENDENCY_MISSING) {
    console.log('缺失依赖:', e.details.installCmd);
  }
}
```

## 注意事项

1. **首次使用前**执行 `npm run check-deps` 查看可用渲染器
2. Python 渲染器通过子进程调用，要求环境变量 `PYTHON` 指向正确 Python 路径
3. 所有临时文件自动清理，输出文件默认保存到 `output/` 目录
4. 中文字体使用系统 SimHei，如不存在请安装或设置 `TDK_FONT_PATH` 环境变量
