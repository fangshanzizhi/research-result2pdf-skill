# Tech Diagram Kit - API 参考

## 统一入口

```javascript
const tdk = require('tech-diagram-kit');
```

---

## 核心 API

### `render(options)`

最通用的渲染接口，直接指定 domain + type。

```javascript
const result = await tdk.render({
  domain: 'math',           // 领域
  type: 'formula',          // 图表类型
  input: { latex: 'E=mc^2' },  // 领域专用输入
  format: 'png',            // 输出格式
  outputPath: 'output/math.png', // 输出路径（可选）
  width: 800,               // 宽度像素（可选）
  dpi: 200,                 // DPI（可选，默认200）
});

// result = { success: true, path: '...', format: 'png', size: 1234, renderer: 'mathjax', fallbackUsed: false }
```

### `listDomains()`

返回所有支持的领域数组。

```javascript
const domains = tdk.listDomains();
// ['chemistry', 'physics', 'math', 'cs', 'ai', 'network', 'chip', 'manufacturing', 'general']
```

### `listSupported()`

返回完整的支持矩阵。

```javascript
const supported = tdk.listSupported();
// { chemistry: [{ type: 'molecule', formats: ['png','svg'], renderer: 'rdkit', fallback: null }, ...] }
```

### `checkDependency(name)` / `checkAllDependencies()`

检查渲染器依赖是否可用。

```javascript
const status = tdk.checkDependency('mermaid');
// { available: true, known: true, name: 'mermaid', guide: null }

const all = tdk.checkAllDependencies();
// { mermaid: {...}, d2: {...}, matplotlib: {...} }
```

---

## 领域接口

### Chemistry 化学

#### `chemistry.molecule(smiles, options)`

```javascript
await tdk.chemistry.molecule('CCO', {
  format: 'png',
  width: 400,
  height: 400,
  style: '2d',        // '2d' | 'ball-and-stick'
  outputPath: 'docs/ethanol.png'
});
```

#### `chemistry.reaction(latex, options)`

```javascript
await tdk.chemistry.reaction('2H_2 + O_2 \\rightarrow 2H_2O', {
  format: 'svg',
  fontSize: 16,
  outputPath: 'docs/reaction.svg'
});
```

---

### Physics 物理

#### `physics.formula(latex, options)`

```javascript
await tdk.physics.formula('\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\varepsilon_0}', {
  format: 'svg',
  fontSize: 18,
  outputPath: 'docs/maxwell.svg'
});
```

#### `physics.bandDiagram(options)`

```javascript
await tdk.physics.bandDiagram({
  conductionBand: [1.0, 1.2, 1.5, 1.2, 1.0],
  valenceBand: [-0.5, -0.3, -0.2, -0.3, -0.5],
  fermiLevel: 0.0,
  title: 'Silicon Band Structure',
  format: 'png',
  outputPath: 'docs/band.png'
});
```

#### `physics.field(options)`

```javascript
await tdk.physics.field({
  Ux: '-Y',    // 可用 numpy 表达式
  Vy: 'X',
  title: 'Electromagnetic Field',
  format: 'png'
});
```

---

### Math 数学

#### `math.formula(latex, options)`

```javascript
await tdk.math.formula('\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}');
```

#### `math.geometry(shapes, options)`

```javascript
await tdk.math.geometry([
  { type: 'polygon', points: [[0,0],[2,0],[1,1.732]], fill: '#E8F0FE', stroke: 'blue' },
  { type: 'circle', x: 1, y: 0.577, r: 0.3, fill: 'none', stroke: 'red' }
], {
  xlim: [-1, 3],
  ylim: [-1, 3],
  title: 'Equilateral Triangle',
  format: 'png'
});
```

#### `math.functionPlot(functions, options)`

```javascript
await tdk.math.functionPlot([
  { expr: 'np.sin(x)', label: 'sin(x)', color: 'blue' },
  { expr: 'np.cos(x)', label: 'cos(x)', color: 'red' },
  { expr: 'np.sin(x) * np.exp(-0.1*x)', label: 'damped', color: 'green' }
], {
  xmin: -10,
  xmax: 10,
  title: 'Trigonometric Functions',
  format: 'png'
});
```

---

### CS 计算机/软件工程

#### `cs.uml(data, options)`

```javascript
await tdk.cs.uml({
  classes: [
    { name: 'User', attrs: ['+id', '+name', '+email'], methods: ['+login()', '+logout()'] },
    { name: 'Order', attrs: ['+orderId', '+total'], methods: ['+pay()'] }
  ],
  relations: [
    { from: 'User', to: 'Order', type: '1:N', label: 'places' }
  ]
}, {
  kind: 'class',      // 'class' | 'sequence'
  format: 'png'
});
```

#### `cs.architecture(data, options)`

```javascript
await tdk.cs.architecture({
  dsl: `flowchart TD
    Client -->|HTTP| API_Gateway
    API_Gateway --> Auth
    API_Gateway -->|gRPC| Service_A
    API_Gateway -->|gRPC| Service_B
    Service_A --> DB_A[(Database A)]
    Service_B --> DB_B[(Database B)]
  `
}, { format: 'svg' });
```

#### `cs.er(data, options)`

```javascript
await tdk.cs.er({
  entities: [
    { name: 'User', fields: [{ type: 'int', name: 'id' }, { type: 'varchar', name: 'name' }] },
    { name: 'Post', fields: [{ type: 'int', name: 'id' }, { type: 'text', name: 'content' }] }
  ],
  relations: [
    { from: 'User', to: 'Post', label: 'writes' }
  ]
}, { format: 'svg' });
```

#### `cs.stateMachine(data, options)`

```javascript
await tdk.cs.stateMachine({
  transitions: [
    { from: 'Idle', to: 'Running', label: 'start' },
    { from: 'Running', to: 'Paused', label: 'pause' },
    { from: 'Paused', to: 'Running', label: 'resume' },
    { from: 'Running', to: 'Stopped', label: 'stop' }
  ]
}, { format: 'svg' });
```

#### `cs.flowchart(data, options)` / `cs.gantt(data, options)`

```javascript
await tdk.cs.flowchart({
  dsl: `flowchart LR
    A[Hard] -->|Text| B(Round)
    B --> C{Decision}
    C -->|One| D[Result 1]
    C -->|Two| E[Result 2]
  `
});
```

---

### AI 人工智能

#### `ai.neuralNet(layers, options)`

```javascript
await tdk.ai.neuralNet([784, 512, 256, 128, 10], {
  layerNames: ['Input', 'Hidden1', 'Hidden2', 'Hidden3', 'Output'],
  title: 'MNIST Classifier',
  format: 'png'
});
```

#### `ai.trainingCurve(data, options)`

```javascript
await tdk.ai.trainingCurve({
  epochs: [1, 2, 3, 4, 5],
  trainLoss: [1.0, 0.7, 0.5, 0.35, 0.25],
  valLoss: [1.1, 0.8, 0.6, 0.5, 0.45]
}, {
  title: 'ResNet-50 Training',
  format: 'png'
});
```

#### `ai.heatmap(matrix, labels, options)` / `ai.confusionMatrix(matrix, labels, options)`

```javascript
await tdk.ai.confusionMatrix(
  [[95, 2, 3], [1, 92, 7], [4, 3, 93]],
  ['Cat', 'Dog', 'Bird'],
  { title: 'Classification Confusion Matrix' }
);
```

#### `ai.pipeline(data, options)`

```javascript
await tdk.ai.pipeline({
  dsl: `flowchart LR
    RawData --> Preprocess --> FeatureEngineering --> Model --> Evaluate --> Deploy
  `
}, { format: 'svg' });
```

---

### Network 网络

#### `network.topology(data, options)`

```javascript
await tdk.network.topology({
  nodes: [
    { id: 'internet', label: 'Internet', shape: 'cloud' },
    { id: 'fw', label: 'Firewall', shape: 'box' },
    { id: 'core', label: 'Core Switch' },
    { id: 'srv1', label: 'Web Server', color: '#E6F4EA' },
    { id: 'srv2', label: 'DB Server', color: '#FCE8E6' }
  ],
  edges: [
    { from: 'internet', to: 'fw', label: 'WAN' },
    { from: 'fw', to: 'core', label: 'LAN' },
    { from: 'core', to: 'srv1' },
    { from: 'core', to: 'srv2' }
  ]
}, {
  direction: 'TB',    // 'TB' | 'LR' | 'BT' | 'RL'
  format: 'png'
});
```

#### `network.protocolStack(data, options)`

```javascript
await tdk.network.protocolStack({
  layers: [
    { name: '应用层', protocols: ['HTTP/3', 'DNS', 'QUIC'] },
    { name: '传输层', protocols: ['TCP', 'UDP'] },
    { name: '网络层', protocols: ['IPv4/IPv6', 'ICMP', 'OSPF'] },
    { name: '链路层', protocols: ['以太网', 'WiFi 6', '5G NR'] },
  ]
});
```

---

### Chip 芯片

#### `chip.architecture(data, options)`

```javascript
await tdk.chip.architecture({
  dsl: `direction: right
CPU: { shape: rectangle; style.fill: "#E8F0FE" }
GPU: { shape: rectangle; style.fill: "#E8F0FE" }
NPU: { shape: rectangle; style.fill: "#FCE8E6" }
Memory: { shape: cylinder; style.fill: "#E6F4EA" }
Interconnect: { shape: diamond; style.fill: "#FFF4E5" }
CPU -> Interconnect
GPU -> Interconnect
NPU -> Interconnect
Interconnect -> Memory`
}, { format: 'svg' });
```

#### `chip.noc(meshSize, options)`

```javascript
await tdk.chip.noc(4, {  // 4x4 Mesh NoC
  title: 'AI SoC NoC Architecture',
  format: 'png'
});
```

#### `chip.timing(signals, options)`

```javascript
await tdk.chip.timing([
  { name: 'CLK', wave: [0,0,1,1,0,0,1,1] },
  { name: 'ADDR', wave: [0,0,0,1,1,0,0,0] },
  { name: 'DATA', wave: [0,0,0,0,1,1,1,0] }
], { title: 'Memory Read Timing' });
```

#### `chip.circuit(data, options)`

```javascript
await tdk.chip.circuit({
  circuitType: 'basic'    // 'basic' | 'opamp' | 'logic'
}, { format: 'svg' });
```

---

### Manufacturing 制造业

#### `manufacturing.process(data, options)`

```javascript
await tdk.manufacturing.process({
  steps: [
    { id: 'A', name: '原料入库', next: 'B' },
    { id: 'B', name: 'CNC加工', next: 'C' },
    { id: 'C', name: '热处理', next: 'D' },
    { id: 'D', name: '质检', next: 'E' },
    { id: 'E', name: '包装出货', next: null }
  ]
}, { format: 'svg' });
```

#### `manufacturing.spc(data, options)`

```javascript
await tdk.manufacturing.spc({
  samples: Array.from({length: 30}, (_, i) => i + 1),
  values: [10.1, 10.3, 9.8, 10.2, 10.5, 9.9, 10.0, 10.4, 10.1, 9.7,
           10.2, 10.6, 9.8, 10.1, 10.3, 9.9, 10.0, 10.5, 10.2, 9.8,
           10.1, 10.4, 9.7, 10.0, 10.3, 10.1, 9.9, 10.2, 10.5, 10.0],
  ucl: 11.5,
  lcl: 8.5,
  cl: 10.0
}, { title: 'Diameter SPC Control Chart' });
```

#### `manufacturing.supplyChain(data, options)`

```javascript
await tdk.manufacturing.supplyChain({
  nodes: [
    { id: 'supplier', label: '原材料供应商' },
    { id: 'factory', label: '制造工厂' },
    { id: 'warehouse', label: '仓储中心' },
    { id: 'retailer', label: '零售商' }
  ],
  edges: [
    { from: 'supplier', to: 'factory', label: '原材料' },
    { from: 'factory', to: 'warehouse', label: '成品' },
    { from: 'warehouse', to: 'retailer', label: '配送' }
  ]
});
```

---

### General 通用

#### `general.mindmap(markdown, options)`

```javascript
await tdk.general.mindmap(`
# 技术架构
## 前端
- React + TypeScript
- Tailwind CSS
## 后端
- Node.js + NestJS
- PostgreSQL
## 运维
- Docker
- Kubernetes
`, { format: 'svg' });
```

#### `general.sankey(data, options)`

```javascript
await tdk.general.sankey({
  flows: [0.25, 0.15, 0.60, -0.20, -0.15, -0.05, -0.50, -0.10],
  labels: ['Coal', 'Oil', 'Gas', 'Electric', 'Transport', 'Industry', 'Residential', 'Loss'],
  orientations: [-1, -1, -1, 1, 1, 1, 1, 1],
  unit: 'TWh'
}, { title: 'Energy Flow' });
```

#### `general.chart(data, options)`

```javascript
await tdk.general.chart({
  chartType: 'bar',     // 'bar' | 'pie' | 'line'
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  values: [120, 190, 150, 220],
  colors: ['#4A90D9', '#50C878', '#FF6B6B', '#FFD93D']
}, { title: 'Quarterly Revenue' });
```

---

## 底层渲染器（高级用法）

```javascript
const { renderers } = require('tech-diagram-kit');

// Mermaid
await renderers.mermaid.render({
  input: { code: 'flowchart TD; A-->B;' },
  format: 'svg',
  outputPath: 'output/flow.svg'
});

// Graphviz
await renderers.graphviz.render({
  input: { code: 'digraph G { A -> B; }' },
  format: 'png',
  outputPath: 'output/graph.png'
});

// MathJax
await renderers.mathjax.render({
  input: { latex: '\\sum_{i=1}^{n} x_i' },
  format: 'svg',
  outputPath: 'output/formula.svg'
});

// D2
await renderers.d2.render({
  input: { code: 'x -> y -> z' },
  format: 'svg',
  outputPath: 'output/d2.svg'
});
```

---

## 错误处理

```javascript
const { TdkError, ErrorCode } = require('tech-diagram-kit/src/utils/errors');

try {
  await tdk.chemistry.molecule('CCO');
} catch (e) {
  if (e instanceof TdkError) {
    switch (e.code) {
      case ErrorCode.DEPENDENCY_MISSING:
        console.log('安装命令:', e.details.installCmd);
        break;
      case ErrorCode.UNSUPPORTED_TYPE:
        console.log('不支持的图表类型');
        break;
      case ErrorCode.RENDER_FAILED:
        console.log('渲染失败:', e.message);
        break;
    }
  }
}
```
