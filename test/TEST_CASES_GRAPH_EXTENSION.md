# 图表类型扩展功能测试案例

> 来源：`dev_files/prd_graph_extension.md` §5 功能测试场景清单  
> 格式：表格类型 Markdown

---

## 一、单元测试案例

### 1.1 `listChartTypes()` 返回结构测试

| 用例ID | 场景描述 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|--------|----------|----------|----------|----------|--------|
| UT-LCT-001 | `types` 数组包含 33 种类型 | 加载 `index.js` | 调用 `listChartTypes()` | `result.types.length === 33` | P0 |
| UT-LCT-002 | `typesByDomain` 包含 9 个领域 | 加载 `index.js` | 调用 `listChartTypes()` | `Object.keys(result.typesByDomain).length === 9` | P0 |
| UT-LCT-003 | `typesByDomain.physics` 包含 circuit | 加载 `index.js` | 检查 `result.typesByDomain.physics` | 包含 `{chartType:'circuit', ...}` | P0 |
| UT-LCT-004 | `typesByDomain.cs` 包含 uml/er/statemachine/gantt | 加载 `index.js` | 检查 `result.typesByDomain.cs` | 包含 uml, er, statemachine, gantt | P0 |
| UT-LCT-005 | 向后兼容：原有 12 种类型仍在 | 加载 `index.js` | 遍历 `result.types` | 原有 flowchart, architecture, formula, neuralnet, heatmap, noc, timing, chart, table, sankey 均存在 | P0 |
| UT-LCT-006 | 每个类型包含 `recommendedLayout` | 加载 `index.js` | 遍历 `result.types` | 每个对象都有 `recommendedLayout` 字符串字段 | P1 |

### 1.2 TDK 引擎 REGISTRY 测试

| 用例ID | 场景描述 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|--------|----------|----------|----------|----------|--------|
| UT-REG-001 | `physics.circuit` 已注册 | 加载 `engine.js` | 检查 `REGISTRY['physics.circuit']` | 存在，renderer 为 `'schemdraw'`，fallback 为 `null` | P0 |
| UT-REG-002 | `network.topology` 已注册 | 加载 `engine.js` | 检查 `REGISTRY['network.topology']` | 存在，renderer 为 `'graphviz'`，fallback 为 `'d2'` | P0 |
| UT-REG-003 | `cs.uml` 已注册 | 加载 `engine.js` | 检查 `REGISTRY['cs.uml']` | 存在，renderer 为 `'plantuml'`，fallback 为 `'mermaid'` | P0 |
| UT-REG-004 | `listSupported()` 包含新增类型 | 加载 `engine.js` | 调用 `listSupported()` | 返回对象包含 physics, network, manufacturing, chemistry 键 | P0 |

### 1.3 `physics.circuit()` Domain 接口测试

| 用例ID | 场景描述 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|--------|----------|----------|----------|----------|--------|
| UT-PHY-001 | `circuit()` 调用参数正确 | mock `render` | `physics.circuit({circuitType:'basic'})` | `render` 被调用，参数为 `{domain:'physics', type:'circuit', input:{circuitType:'basic', elements:undefined}}` | P0 |
| UT-PHY-002 | `circuit()` custom 模式 | mock `render` | `physics.circuit({circuitType:'custom', elements:[{type:'Resistor'}]})` | `render` input 包含 `elements` 数组 | P0 |
| UT-PHY-003 | `circuit()` 默认 circuitType | mock `render` | `physics.circuit({})` | `render` input 中 `circuitType` 为 `'basic'` | P0 |

---

## 二、集成测试案例

### 2.1 `generatePdf` 新增类型端到端测试

| 用例ID | 场景描述 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|--------|----------|----------|----------|----------|--------|
| IT-GEN-001 | 生成含 `physics.circuit` 的报告 | 真实 Python + schemdraw | `generatePdf` 含 `desc: [{domain:'physics', chartType:'circuit', input:{circuitType:'basic'}}]` | PDF 存在、images >= 1 | P0 |
| IT-GEN-002 | 生成含 `cs.uml` 的报告 | 真实 Python/PlantUML | `generatePdf` 含 `desc: [{domain:'cs', chartType:'uml', input:{code:'classDiagram...'}}]` | PDF 存在、images >= 1 | P0 |
| IT-GEN-003 | 生成含 `network.topology` 的报告 | 真实 Python/Graphviz | `generatePdf` 含 `desc: [{domain:'network', chartType:'topology', input:{nodes:['R1','R2']}}]` | PDF 存在、images >= 1 | P0 |
| IT-GEN-004 | 渲染失败容错 | 构造无效 input | `desc` 中某项触发 TDK 报错 | PDF 仍生成、失败处显示占位文本 | P1 |
| IT-GEN-005 | 默认路径生成 summary | 无 `outputPath` | `context='PCB技术原理调研报告'` | 生成 `./pdf/PCB技术原理调研报告.pdf` | P0 |
| IT-GEN-006 | 追加模式与新增类型共存 | 已有含 circuit 的 PDF | 再次以相同路径调用 | 文件大小增加、页数增加 | P1 |

### 2.2 完整混排报告测试

| 用例ID | 场景描述 | 前置条件 | 操作步骤 | 预期结果 | 优先级 |
|--------|----------|----------|----------|----------|--------|
| IT-MIX-001 | PCB 调研报告（多图表混排） | 真实 Python 环境 | 使用 `fixtures/pcb-mixed.json` 调用 `generatePdf` | PDF 存在、pages >= 3、images >= 4 | P0 |

---

## 三、测试数据

### 3.1 `test/fixtures/pcb-mixed.json`

```json
{
  "context": "PCB技术原理调研报告",
  "struct": [
    { "type": "cover", "title": "PCB技术原理调研报告", "subtitle": "从基材到高密度互连的技术演进" },
    { "type": "heading", "text": "一、PCB制造流程", "level": 1 },
    { "type": "paragraph", "text": "PCB制造主要包括以下步骤：" },
    { "type": "diagram", "ref": "fig_flow", "layout": "fullwidth", "caption": "PCB制造流程" },
    { "type": "heading", "text": "二、系统架构", "level": 1 },
    { "type": "diagram", "ref": "fig_arch", "layout": "fullwidth", "caption": "PCB产业链架构" },
    { "type": "heading", "text": "三、信号完整性分析", "level": 1 },
    { "type": "paragraph", "text": "高速信号传输中的衰减模型：" },
    { "type": "diagram", "ref": "fig_formula", "layout": "inline", "caption": "传输线损耗公式" },
    { "type": "heading", "text": "四、电路示例", "level": 1 },
    { "type": "diagram", "ref": "fig_circuit", "layout": "halfwidth", "caption": "RC滤波电路" },
    { "type": "heading", "text": "五、企业对比", "level": 1 },
    { "type": "diagram", "ref": "fig_chart", "layout": "fullwidth", "caption": "市场份额对比" }
  ],
  "desc": [
    { "id": "fig_flow", "domain": "cs", "chartType": "flowchart", "input": { "dsl": "flowchart LR\nA[基材准备] --> B[蚀刻] --> C[层压] --> D[钻孔] --> E[电镀] --> F[测试]" } },
    { "id": "fig_arch", "domain": "cs", "chartType": "architecture", "input": { "dsl": "graph TD\nA[上游材料] --> B[CCL覆铜板] --> C[PCB制造] --> D[下游应用]" } },
    { "id": "fig_formula", "domain": "math", "chartType": "formula", "input": { "latex": "\\alpha(f) = \\alpha_0 \\sqrt{f} + \\alpha_{diel} f" } },
    { "id": "fig_circuit", "domain": "physics", "chartType": "circuit", "input": { "circuitType": "basic" } },
    { "id": "fig_chart", "domain": "general", "chartType": "chart", "input": { "chartType": "bar", "labels": ["鹏鼎","东山","深南","沪电"], "values": [25,20,18,15] } }
  ]
}
```
