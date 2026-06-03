# 功能测试场景文档

> 本文档与 `TEST_REQUIREMENTS.md` 互补，侧重场景描述与执行前提。

---

## 执行前提

1. Node.js ≥ 18
2. Python 3.8+ 且已安装 `reportlab`
3. `tech-diagram-kit/` 目录存在且包含 `src/index.js`
4. 执行命令：`npm test` 或 `npx jest test/integration`

---

## 场景清单

| 场景ID | 名称 | 输入 | 预期结果 | 优先级 |
|--------|------|------|----------|--------|
| F-001 | 最小报告（无图表） | `fixtures/no-chart.json` | PDF 存在、size>0、pages≥1 | P0 |
| F-002 | 含图表报告 | `fixtures/with-chart.json` | PDF 存在、images≥1 | P0 |
| F-003 | 自定义输出路径 | `outputPath: '/tmp/custom.pdf'` | 文件在指定路径 | P0 |
| F-004 | 默认输出路径 | `context='光模块'`，无 `outputPath` | 生成在 `./pdf/光模块.pdf` | P0 |
| F-005 | 文件名冲突递增 | 同名文件已存在 | 自动 `_1`、`_2` 递增 | P1 |
| F-006 | 多元素混排 | `fixtures/mixed.json` | 各元素顺序正确、排版正常 | P1 |
| F-007 | 图表渲染失败容错 | `fixtures/fail-chart.json` | PDF 仍生成、images=0 | P1 |
| F-008 | 页数读取 | 任意有效输入 | `pages` 为整数或 null | P1 |
| F-009 | 环境未就绪阻断 | mock `checkPythonEnv` 返回 ok=false | 抛出明确错误 | P0 |
| F-010 | 复杂文件名安全化 | `context='A/B<C>:D'` | 文件名无非法字符 | P1 |

---

## 环境不可用时的行为

当 Python 或 reportlab 不可用时，集成测试自动 `test.skip`，不标记为失败。
单元测试通过 mock 覆盖，不受真实环境影响。
