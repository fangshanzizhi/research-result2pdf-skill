# 图表类型扩展测试场景文档

> 与 `TEST_CASES_GRAPH_EXTENSION.md` 互补，侧重场景描述与执行前提。

---

## 执行前提

1. Node.js ≥ 18
2. Python 3.8+ 且已安装 `reportlab`
3. `tech-diagram-kit/` 目录存在且包含 `src/index.js`
4. 执行命令：`npm test`

---

## 场景清单

| 场景ID | 名称 | 输入 | 验证点 | 优先级 |
|--------|------|------|--------|--------|
| **G-001** | 类型发现完整性 | 调用 `listChartTypes()` | 返回 33 种类型、9 个领域、含 physics.circuit | P0 |
| **G-002** | 电路图渲染 | `physics.circuit` basic 类型 | PDF 中包含电路图、SVG/PNG 正常嵌入 | P0 |
| **G-003** | 自定义电路 | `physics.circuit` custom 类型 | 自定义元件列表正确渲染 | P0 |
| **G-004** | 6 类图形全覆盖 | 遍历 `listChartTypes().types` | 包含 flowchart, architecture, topology, uml, formula, circuit | P0 |
| **G-005** | 向后兼容 | 使用原有 `cs.flowchart` | 行为与 v1.0 一致 | P0 |
| **G-006** | 渲染失败容错 | 构造无效 TDK 输入 | PDF 仍生成、占位文本替代失败图表 | P1 |
| **G-007** | 领域分组正确 | 检查 `typesByDomain` | physics 含 4 项、cs 含 6 项 | P0 |
| **G-008** | 默认路径 summary | `context='PCB技术原理调研报告'` | 文件名安全化、生成到 `./pdf/` | P0 |
| **G-009** | PCB 模拟场景 | `fixtures/pcb-mixed.json` | PDF 存在、pages≥3、images≥4、size>0 | P0 |
| **G-010** | 追加模式 | 相同 `outputPath` 两次调用 | 第二次文件更大、页数更多 | P1 |

---

## 环境不可用时的行为

当 Python 或 `schemdraw` 不可用时：
- 单元测试通过 mock 覆盖，不受真实环境影响
- 集成测试中涉及真实渲染的用例自动 `test.skip`
- `listChartTypes()` 始终可调用，不依赖 Python
