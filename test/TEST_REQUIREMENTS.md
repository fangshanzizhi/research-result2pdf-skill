# 测试需求文档

## 1. 模块概览

### 1.1 compat.js
- **职责**: Node.js ↔ Python 兼容性桥接层，处理解释器检测、命令行安全编码、子进程封装、环境预检。
- **导出函数列表**:
  | 函数 | 职责 |
  |------|------|
  | `findPython()` | 多策略查找可用的 Python 解释器（环境变量 → 硬编码路径 → shell 查找 → PATH 遍历） |
  | `getPython()` | 带缓存的 `findPython()` 包装器 |
  | `validatePython(pythonPath)` | 执行 Python 并验证版本 >= 3.8 |
  | `checkPyPackage(pythonPath, packageName)` | 检查指定 Python 包是否已安装 |
  | `shellEscape(str)` | 平台相关的命令行参数安全转义 |
  | `pyPath(filePath)` | 将路径中的反斜杠替换为正斜杠 |
  | `runPython(pythonPath, args, options)` | 基于 `spawn` 的健壮异步子进程调用（含超时） |
  | `runPythonExpr(pythonPath, code, options)` | 基于 `execSync` 的单行 Python 命令执行 |
  | `checkPythonEnv()` | 一次性完整环境检查，聚合上述所有检查 |

### 1.2 index.js
- **职责**: PDF Reporter Skill 主入口，负责业务编排、图表渲染调用、report.json 组装、Python PDF 组装器调用。
- **导出函数列表**:
  | 函数 | 职责 |
  |------|------|
  | `generatePdf(options)` | 核心功能：接收报告描述，渲染图表，生成 PDF |
  | `init()` | 初始化工作目录，创建默认 `pdf/` 输出目录 |
- **内部函数（未导出但关键）**:
  | 函数 | 职责 |
  |------|------|
  | `listChartTypes()` | 返回支持的图表类型速查表 |
  | `sanitizeFilename(context)` | 将报告主题转换为安全的文件名字符串 |
  | `uniquePdfPath(dir, basename)` | 生成不重复的文件路径（自动加 `_1`, `_2`） |
  | `checkReady()` | 检查环境是否就绪，如缺失依赖返回安装指引 |

### 1.3 setup.js
- **职责**: 环境初始化脚本，一键检查并安装所有依赖（Python 包、Node 包、CLI 工具、目录）。
- **导出**: 无（脚本级 side-effect，直接运行）。
- **内部函数列表**:
  | 函数 | 职责 |
  |------|------|
  | `print(label, status, detail)` | 带颜色图标的格式化控制台输出 |
  | `section(title)` | 输出带分隔的章节标题 |
  | `installPyPackage(python, pkg)` | 调用 `pip install` 安装指定包 |

---

## 2. 单元测试需求

### 2.1 compat.js

#### findPython()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-001 | 环境变量优先且存在 | `TDK_PYTHON=/usr/bin/python3`（存在） | 返回该绝对路径 | P0 |
| C-002 | 环境变量存在但路径无效 | `TDK_PYTHON=/not/exist/python` | 忽略，继续后续策略 | P1 |
| C-003 | Windows 硬编码路径命中 | `process.platform = 'win32'`，`DEFAULT_WIN_PATHS` 中某路径存在 | 返回首个命中路径 | P1 |
| C-004 | Shell 命令查找成功 | `which python3` 返回有效路径 | 返回该路径 | P0 |
| C-005 | Shell 命令查找失败 | `which` 命令抛出异常 | 忽略异常，进入 PATH 候选遍历 | P1 |
| C-006 | PATH 候选遍历命中 | `python3` 在 PATH 中 | 返回解析后的绝对路径 | P0 |
| C-007 | 所有策略均未找到 | 无有效 Python 环境 | 返回 `null` | P0 |
| C-008 | 跨平台兼容性（Windows） | `process.platform = 'win32'` | 使用 `where` 而非 `which` | P1 |
| C-009 | 跨平台兼容性（Unix） | `process.platform = 'linux'` | 使用 `which` 及 `python3` / `python` | P1 |

#### getPython()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-010 | 首次调用 | 未缓存 | 调用 `findPython()` 并缓存结果 | P1 |
| C-011 | 二次调用 | 已缓存 | 直接返回缓存值，不再调用 `findPython()` | P1 |

#### validatePython()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-012 | 有效 Python 3.8+ | `/usr/bin/python3`（v3.10） | `{ ok: true, version: '3.10' }` | P0 |
| C-013 | Python 版本过低（3.7） | 返回 `(3, 7)` | `{ ok: false, error: 'Python 版本过低...' }` | P1 |
| C-014 | Python 2.x | 返回 `(2, 7)` | `{ ok: false, error: 'Python 版本过低...' }` | P1 |
| C-015 | 路径不存在/不可执行 | `/not/exist/python` | `{ ok: false, error: ... }` | P0 |
| C-016 | 输出无法解析 | Python 打印非版本格式内容 | `{ ok: false, error: '无法解析 Python 版本' }` | P1 |

#### checkPyPackage()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-017 | 包已安装 | `pythonPath`, `'reportlab'` | `{ installed: true }` | P0 |
| C-018 | 包未安装 | `pythonPath`, `'not_a_real_pkg'` | `{ installed: false, error: ... }` | P0 |

#### shellEscape()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-019 | Windows 双引号转义 | `"hello \"world\""`（win32） | `"hello \\"world\\""` | P1 |
| C-020 | Windows 反斜杠转义 | `"C:\\path"`（win32） | `"C:\\\\path"` | P1 |
| C-021 | Unix 单引号转义 | `'it's me'`（linux） | `'it'\''s me'` | P1 |
| C-022 | 简单字符串 | `"hello"` | 正确包裹引号 | P1 |

#### pyPath()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-023 | Windows 路径转换 | `C:\\Users\\a\\b.py` | `C:/Users/a/b.py` | P1 |
| C-024 | Unix 路径保持不变 | `/usr/bin/python` | `/usr/bin/python` | P1 |

#### runPython()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-025 | 正常执行 | `python`, `['-c', 'print(1)']` | `{ stdout: '1\n', stderr: '', code: 0 }` | P0 |
| C-026 | 非零退出码 | `python`, `['-c', 'import sys; sys.exit(2)']` | Promise reject，err.code=2，含 stdout/stderr | P0 |
| C-027 | 超时终止 | 执行 `sleep(100)`，timeout=100ms | Promise reject，`Python process timed out...` | P0 |
| C-028 | 启动失败（非法路径） | `/not/exist/python` | Promise reject，`Failed to start Python...` | P0 |
| C-029 | 自定义 env 合并 | `env: { FOO: 'bar' }` | 子进程环境变量包含 `FOO` 和 `PYTHONIOENCODING` | P1 |
| C-030 | 自定义 cwd | `cwd: '/tmp'` | 子进程在 `/tmp` 中执行 | P1 |
| C-031 | 大量 stderr/stdout 截断 | 输出超长内容 | 错误信息中保留最后 2000 字符 | P1 |

#### runPythonExpr()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-032 | 含双引号的表达式 | `code = 'print("hello")'` | 使用单引号包裹执行 | P1 |
| C-033 | 含单引号的表达式 | `code = "print('hello')"` | 使用双引号包裹执行 | P1 |
| C-034 | 执行异常 | `code = 'raise RuntimeError("x")'` | Promise reject / throw | P1 |

#### checkPythonEnv()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| C-035 | 完整环境就绪 | Python 3.10 + reportlab + pymupdf | `{ ok: true, python, version, packages, missing: [] }` | P0 |
| C-036 | 未找到 Python | `getPython()` 返回 `null` | `{ ok: false, error: '未找到可用的 Python 解释器...' }` | P0 |
| C-037 | Python 版本过低 | Python 3.7 | `{ ok: false, error: 'Python 版本过低...' }` | P1 |
| C-038 | 缺少 reportlab | Python 正常，无 reportlab | `{ ok: true, missing: ['reportlab ...'] }` | P1 |
| C-039 | 缺少 pymupdf（可选） | Python 正常，无 pymupdf | `{ ok: true, missing: ['pymupdf ... [可选]'] }` | P2 |

---

### 2.2 index.js

#### listChartTypes()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-001 | 返回速查表 | 无 | 包含 `types` 数组、`layouts` 对象、`templatesDir` | P1 |

#### init()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-002 | 创建输出目录 | `pdf/` 不存在 | 创建目录，返回 `{ pdfDir, templatesDir }` | P1 |
| I-003 | 目录已存在 | `pdf/` 已存在 | 不报错，直接返回路径对象 | P1 |

#### sanitizeFilename()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-004 | 普通文本 | `"光模块研究报告"` | `光模块研究报告` | P1 |
| I-005 | 含特殊字符 | `"A/B\\C<D>:E|F?G*H I"` | `A_B_C_D_E_F_G_H_I` | P1 |
| I-006 | 多个连续特殊字符/空格 | `"A  B<>C"` | `A_B_C` | P1 |
| I-007 | 超过 40 字符 | 50 字符的字符串 | 截断为前 40 字符 | P1 |
| I-008 | 仅含特殊字符/空字符串 | `"<>"` / `""` | `'report'` | P1 |
| I-009 | 首尾下划线清理 | `"__abc__"` | `abc` | P1 |

#### uniquePdfPath()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-010 | 无冲突 | `dir='./pdf'`, `basename='abc'` | `./pdf/abc.pdf` | P1 |
| I-011 | 单次冲突 | `./pdf/abc.pdf` 已存在 | `./pdf/abc_1.pdf` | P1 |
| I-012 | 多次冲突 | `abc.pdf`, `abc_1.pdf` 已存在 | `./pdf/abc_2.pdf` | P1 |

#### checkReady()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-013 | 环境完全就绪 | Python + reportlab + pymupdf | `{ ok: true, pyInfo }` | P0 |
| I-014 | Python 未找到 | `checkPythonEnv()` 返回 `ok: false` | `{ ok: false, error: ..., setupPath }` | P0 |
| I-015 | 缺少必需包 | 无 reportlab | `{ ok: false, error: '缺少必需的 Python 包...', setupPath }` | P0 |

#### generatePdf()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| I-016 | 缺少 context | `{ struct: [] }` | `throw Error('Missing required fields: context...')` | P0 |
| I-017 | 缺少 struct | `{ context: 'x' }` | `throw Error('Missing required fields: context...')` | P0 |
| I-018 | 环境未就绪 | `checkReady()` 返回 `ok: false` | `throw Error`（含安装指引） | P0 |
| I-019 | 最小报告（无图表） | `context`, `struct=[{type:'heading',...}]`, `desc=[]` | 成功生成 PDF，返回 `success, path, size, pages` | P0 |
| I-020 | 含图表渲染 | `desc` 含有效 diagram 定义 | 调用 `tdk.render`，PDF 包含图片 | P0 |
| I-021 | diagram 缺少 id | `desc` 中某项无 `id` | 跳过该图表，打印 `Skipping diagram without id` | P1 |
| I-022 | 图表渲染失败 | `tdk.render` reject / `success: false` | 打印 `[FAIL]` 警告，继续生成 PDF | P1 |
| I-023 | 图表 ref 未找到 | `struct` 中 `diagram.ref` 不在 `images` 中 | 替换为 `[图表未渲染: xxx]` 段落 | P1 |
| I-024 | 自定义 outputPath | `outputPath: '/tmp/out.pdf'` | 生成到指定路径 | P0 |
| I-025 | 默认输出路径 | 无 `outputPath` | 生成到 `./pdf/{sanitizeFilename(context)}.pdf` | P0 |
| I-026 | 输出路径冲突 | 默认文件名已存在 | 使用 `uniquePdfPath` 生成 `_1` / `_2` | P1 |
| I-027 | 未知 struct type | `type: 'unknown'` | 透传至 `report.content` | P1 |
| I-028 | Python assembler 失败 | `runPython` reject | `throw Error`，stderr 打印到 console | P0 |
| I-029 | PDF 文件未生成 | Python 退出码 0 但无文件 | `throw Error('PDF file was not generated')` | P0 |
| I-030 | 成功读取页数 | `pymupdf` 可用 | 返回结果包含 `pages` 数字 | P1 |
| I-031 | 页数读取失败 | `pymupdf` 可用但 `fitz.open` 抛错 | `pages` 为 `null`，不中断流程 | P2 |
| I-032 | pymupdf 不可用 | `pymupdf` 未安装 | `pages` 为 `null` | P2 |
| I-033 | 图片统计正确 | 渲染 2 张成功，1 张失败 | 返回 `images: 2` | P1 |
| I-034 | 输出目录级联创建 | `outputPath: '/tmp/a/b/c/out.pdf'` | 自动创建 `a/b/c` | P1 |

---

### 2.3 setup.js

#### print()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| S-001 | OK 状态 | `label='x', status='OK'` | 控制台输出绿色 ✓ | P2 |
| S-002 | WARN 状态 | `label='x', status='WARN'` | 控制台输出黄色 ⚠ | P2 |
| S-003 | FAIL 状态 | `label='x', status='FAIL'` | 控制台输出红色 ✗ | P2 |

#### section()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| S-004 | 章节标题 | `title='测试'` | 控制台输出带 `▶` 的加粗标题 | P2 |

#### installPyPackage()
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| S-005 | 安装成功 | `python`, `'reportlab'` | 返回 `true` | P1 |
| S-006 | 安装失败 | `python`, `'nonexistent-pkg-12345'` | 返回 `false` | P1 |
| S-007 | CHECK_ONLY 模式 | 设置 `--check-only` | `stdio: 'pipe'`，不实际安装 | P1 |

#### 脚本主流程（模块加载/执行副作用）
| 用例ID | 场景描述 | 输入 | 期望输出 | 优先级 |
|--------|----------|------|----------|--------|
| S-008 | `--check-only` 参数识别 | `node setup.js --check-only` | `CHECK_ONLY = true` | P1 |
| S-009 | Python 缺失 → 失败退出 | `checkPythonEnv()` 返回 `ok: false` | 输出 FAIL，退出码 `1` | P0 |
| S-010 | 必需包缺失且自动安装 | 无 reportlab，非 check-only | 调用 `pip install`，成功后输出 OK | P1 |
| S-011 | 必需包安装失败 | pip 报错 | 输出 FAIL，退出码 `1` | P1 |
| S-012 | TDK 目录不存在 | `../../tech-diagram-kit` 不存在 | 输出 FAIL，退出码 `1` | P1 |
| S-013 | TDK 入口文件不存在 | `src/index.js` 不存在 | 输出 FAIL，退出码 `1` | P1 |
| S-014 | reports 目录自动创建 | `reports/` 不存在 | 创建目录并输出 OK | P1 |
| S-015 | Node 依赖缺失 | `mathjax-node` 未安装 | 输出 WARN（不影响退出码） | P2 |
| S-016 | CLI 工具缺失 | `mmdc` / `d2` / `dot` 未安装 | 输出 WARN（不影响退出码） | P2 |
| S-017 | 全部通过 | 所有检查 OK | 绿色 `✓ 初始化全部通过`，退出码 `0` | P1 |
| S-018 | 仅存在警告 | 有 WARN 但无 FAIL | 黄色 `⚠ 初始化完成...`，退出码 `0` | P1 |

---

## 3. 功能测试需求

功能测试覆盖 `generatePdf` 的端到端场景，需要真实 Python 环境与 TDK 依赖。

| 用例ID | 场景描述 | 输入 | 验证点 | 优先级 |
|--------|----------|------|--------|--------|
| F-001 | 生成最小报告（无图表） | `context`, `struct` 仅含 heading/paragraph | PDF 文件存在、size > 0、pages >= 1 | P0 |
| F-002 | 生成含图表的报告 | `desc` 含 flowchart / bar chart | PDF 存在、图片正确嵌入、页数 >= 1 | P0 |
| F-003 | 自定义输出路径 | `outputPath: '/tmp/custom.pdf'` | 文件生成在指定路径 | P0 |
| F-004 | 默认输出路径与命名 | 无 `outputPath`，`context='光模块'` | 生成在 `./pdf/光模块.pdf` | P0 |
| F-005 | 文件名冲突自动递增 | 同名文件已存在 | 生成 `_1.pdf`，再试生成 `_2.pdf` | P1 |
| F-006 | 多图表混排 | struct 含 cover / heading / diagram / table / pagebreak | 各元素按顺序渲染，排版正常 | P1 |
| F-007 | 图表渲染失败容错 | desc 中某项触发 TDK 报错 | PDF 仍生成，失败处显示占位文本 | P1 |
| F-008 | 页数读取（pymupdf） | 生成 3 页报告 | 返回结果 `pages === 3` | P1 |
| F-009 | 环境未就绪阻断 | 卸载 reportlab 后调用 | 抛出明确错误，提示运行 setup.js | P0 |
| F-010 | 复杂文件名安全处理 | `context='A/B<C>:D'` | 文件名安全化，PDF 正常生成 | P1 |

---

## 4. 边界条件与异常场景

| 用例ID | 场景描述 | 相关模块 | 预期行为 | 优先级 |
|--------|----------|----------|----------|--------|
| B-001 | `struct` 为空数组 | `generatePdf` | 生成仅含标题的空报告（1 页） | P1 |
| B-002 | `desc` 为 `null` / `undefined` | `generatePdf` | 按空数组处理，不报错 | P1 |
| B-003 | `diagram` 的 `ref` 与 `id` 混用 | `generatePdf` | `item.ref || item.id` 均能正确匹配 | P1 |
| B-004 | 超长 context（>100 字符） | `sanitizeFilename` + `generatePdf` | 截断为 40 字符，正常生成 | P1 |
| B-005 | 输出路径为相对路径 `../out.pdf` | `generatePdf` | `path.resolve` 正确解析 | P1 |
| B-006 | 输出路径指向无权限目录 | `generatePdf` | Python 或 Node 层抛出权限错误 | P1 |
| B-007 | `runPython` 超时边界（恰好 0ms） | `runPython` | 立即触发超时 kill | P2 |
| B-008 | `shellEscape` 空字符串 | `shellEscape` | 返回 `''` 或 `\"\"` / `''`（平台相关） | P2 |
| B-009 | `findPython` 在 WSL / Git Bash 环境 | `findPython` | 正确识别 Windows 路径和 Unix 命令 | P2 |
| B-010 | `setup.js` 在非 TTY 环境运行 | `setup.js` | ANSI 颜色码仍可输出，不抛异常 | P2 |
| B-011 | `images` 对象 key 为特殊字符 | `generatePdf` | 正常作为文件名/字典 key 处理 | P2 |
| B-012 | TDK render 返回成功但 path 不存在 | `generatePdf` | `images[id]` 存在但后续 fs 检查可能异常 | P2 |

---

## 5. 测试数据需求（fixtures）

### 5.1 最小有效报告（no-chart）
```json
{
  "context": "最小测试报告",
  "struct": [
    { "type": "cover", "title": "测试", "subtitle": "单元测试" },
    { "type": "heading", "text": "概述", "level": 1 },
    { "type": "paragraph", "text": "这是一段测试文本。" }
  ],
  "desc": []
}
```

### 5.2 含图表报告（with-chart）
```json
{
  "context": "图表测试报告",
  "struct": [
    { "type": "heading", "text": "图表示例", "level": 1 },
    { "type": "diagram", "ref": "chart01", "layout": "fullwidth", "caption": "柱状图" }
  ],
  "desc": [
    {
      "id": "chart01",
      "domain": "general",
      "chartType": "chart",
      "input": { "chartType": "bar", "labels": ["A","B"], "values": [10,20] }
    }
  ]
}
```

### 5.3 图表失败容错（fail-chart）
```json
{
  "context": "容错测试",
  "struct": [
    { "type": "diagram", "ref": "bad", "caption": "应该失败" },
    { "type": "paragraph", "text": "后文" }
  ],
  "desc": [
    { "id": "bad", "domain": "general", "chartType": "chart", "input": {} }
  ]
}
```
（预期 TDK 因缺少必要字段而渲染失败）

### 5.4 复杂结构（mixed）
包含 cover、heading、paragraph、bullet、summary、table、pagebreak、diagram（多种 layout：fullwidth / inline / halfwidth / standalone）的组合。

### 5.5 环境 mock 数据
- **Python 3.7 路径**: 用于 `validatePython` 版本过低测试。
- **无效 Python 路径**: `/dev/null` 或 `C:\\Windows\\notepad.exe`（非 Python 可执行文件）。
- **缺失包 Python**: 使用 virtualenv 仅安装标准库，用于 `checkPyPackage` / `checkPythonEnv` 测试。

---

## 6. 测试依赖与前提条件

1. **真实 Python 3.8+ 环境**：`compat.js` 的集成测试需要。
2. **TDK 目录**：`../../tech-diagram-kit` 需存在（功能测试）。
3. **可选包**：`pymupdf`、`matplotlib`、`numpy`（功能完整测试）。
4. **CLI 工具**（可选）：`mmdc`、`d2`、`dot`（仅影响部分图表渲染）。
5. **文件系统权限**：能够创建/删除临时目录与 PDF 文件。

---

## 7. 总结

- **待测函数总数**: **17 个**
  - `compat.js`: 9 个导出函数
  - `index.js`: 2 个导出函数 + 4 个关键内部函数
  - `setup.js`: 3 个内部函数 + 主流程副作用

- **测试用例总数**: **66 个**
  - 单元测试（compat.js）: 24 个
  - 单元测试（index.js）: 19 个
  - 单元/集成测试（setup.js）: 15 个
  - 功能测试（端到端）: 10 个
  - 边界条件与异常场景: 12 个（部分与上述用例有交叉，可合并实现）

> **优先级分布**: P0（核心）约 20 个，P1（重要）约 36 个，P2（可选）约 10 个。建议优先完成所有 P0 和 P1 用例，确保核心路径与主要边界覆盖。
