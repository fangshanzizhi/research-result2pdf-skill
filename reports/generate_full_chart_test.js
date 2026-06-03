const reporter = require('../index.js');

const struct = [
  { type: 'cover', title: '全图表类型测试报告', subtitle: '覆盖 9 种图表类型的渲染验证' },
  
  { type: 'heading', text: '一、通用图表', level: 1 },
  { type: 'paragraph', text: '测试 chart（柱状图）、flowchart（流程图）、architecture（架构图）的渲染能力。' },
  { type: 'diagram', ref: 'fig_chart', layout: 'half', caption: '通用柱状图' },
  { type: 'diagram', ref: 'fig_flowchart', layout: 'half', caption: 'D2 流程图' },
  { type: 'diagram', ref: 'fig_architecture', layout: 'fullwidth', caption: 'D2 架构图' },
  
  { type: 'heading', text: '二、AI 与数学', level: 1 },
  { type: 'paragraph', text: '测试 neuralnet（神经网络）、formula（数学公式）的渲染能力。' },
  { type: 'diagram', ref: 'fig_neuralnet', layout: 'half', caption: '神经网络拓扑图' },
  { type: 'diagram', ref: 'fig_formula', layout: 'half', caption: '数学公式' },
  
  { type: 'heading', text: '三、物理与芯片', level: 1 },
  { type: 'paragraph', text: '测试 circuit（电路图）、timing（时序图）的渲染能力。' },
  { type: 'diagram', ref: 'fig_circuit', layout: 'half', caption: '基础电路图' },
  { type: 'diagram', ref: 'fig_timing', layout: 'half', caption: '时序图' },
  
  { type: 'heading', text: '四、化学与网络', level: 1 },
  { type: 'paragraph', text: '测试 molecule（分子结构）、network（网络拓扑）、process（流程图）的渲染能力。' },
  { type: 'diagram', ref: 'fig_molecule', layout: 'half', caption: '分子结构（阿司匹林）' },
  { type: 'diagram', ref: 'fig_network', layout: 'half', caption: 'Graphviz 网络拓扑' },
  { type: 'diagram', ref: 'fig_process', layout: 'fullwidth', caption: 'Mermaid 流程图' }
];

const desc = [
  {
    id: 'fig_chart',
    domain: 'general',
    chartType: 'chart',
    input: { chartType: 'bar', labels: ['A','B','C','D'], values: [10, 25, 15, 30] },
    caption: '通用柱状图测试'
  },
  {
    id: 'fig_flowchart',
    domain: 'general',
    chartType: 'flowchart',
    input: `direction: right
A: 开始
B: 处理
C: 结束
A -> B -> C`,
    caption: 'D2 流程图测试'
  },
  {
    id: 'fig_architecture',
    domain: 'general',
    chartType: 'architecture',
    input: `direction: right
Frontend: Web App
  Backend: API Gateway
    Database: PostgreSQL
    Cache: Redis
Frontend -> Backend
Backend -> Database
Backend -> Cache`,
    caption: 'D2 架构图测试'
  },
  {
    id: 'fig_neuralnet',
    domain: 'ai',
    chartType: 'neuralnet',
    input: { layers: [4, 6, 4, 2] },
    caption: '神经网络拓扑图测试'
  },
  {
    id: 'fig_formula',
    domain: 'general',
    chartType: 'formula',
    input: 'E = mc^2',
    caption: '数学公式测试'
  },
  {
    id: 'fig_circuit',
    domain: 'physics',
    chartType: 'circuit',
    input: 'vsource: V1 5V\nresistor: R1 1k\nground: GND\nV1 -> R1 -> GND',
    caption: '基础电路图测试'
  },
  {
    id: 'fig_timing',
    domain: 'chip',
    chartType: 'timing',
    input: { signals: [
      { name: 'CLK', wave: 'p....' },
      { name: 'DATA', wave: 'x.===x', data: ['D0','D1','D2'] },
      { name: 'ADDR', wave: 'x.=.x', data: ['A0'] }
    ]},
    caption: '时序图测试'
  },
  {
    id: 'fig_molecule',
    domain: 'chemistry',
    chartType: 'molecule',
    input: { smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
    caption: '阿司匹林分子结构'
  },
  {
    id: 'fig_network',
    domain: 'general',
    chartType: 'network',
    input: `graph G {
  rankdir=LR;
  node [shape=box, style=filled, fillcolor=lightblue];
  A [label="负载均衡"];
  B [label="Web服务器1"];
  C [label="Web服务器2"];
  D [label="数据库"];
  A -- B;
  A -- C;
  B -- D;
  C -- D;
}`,
    caption: 'Graphviz 网络拓扑测试'
  },
  {
    id: 'fig_process',
    domain: 'general',
    chartType: 'process',
    input: `direction: right
A: 开始
B: 条件判断 {
  是 -> C: 处理A
  否 -> D: 处理B
}
C -> E: 结束
D -> E`,
    caption: '流程图测试（D2 语法）'
  }
];

reporter.generatePdf({
  context: '全图表类型测试报告',
  struct,
  desc,
  outputPath: 'E:/Skills_Creator/research-result2pdf-skill/reports/全图表类型测试报告.pdf'
}).then(r => {
  console.log('Result:', JSON.stringify(r, null, 2));
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
