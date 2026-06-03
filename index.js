/**
 * PDF Reporter Skill - 自动报告生成器
 * 接收 context/struct/desc，自动渲染图表 + 组装 PDF
 *
 * 跨语言兼容性：
 *   • Node.js 负责：业务编排、调用 TDK、组织 report.json
 *   • Python 负责：PDF 物理排版（ReportLab）
 *   • 通信协议：JSON 文件（中间件解耦）
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  getPython,
  runPython,
  pyPath,
  checkPythonEnv,
} = require('./compat');

// 定位 TDK（内嵌在 skill 目录中）
const TDK_DIR = path.resolve(__dirname, './tech-diagram-kit');
const tdk = require(path.join(TDK_DIR, 'src/index.js'));

/**
 * 返回支持的图表类型速查表，供 Agent 在组织数据前查看
 * @returns {object}
 */
function listChartTypes() {
  const types = [
    // cs — 计算机科学
    { domain: 'cs', chartType: 'flowchart', desc: '流程图（Mermaid）', example: 'input: { dsl: "flowchart LR\\nA-->B-->C" }', recommendedLayout: 'fullwidth' },
    { domain: 'cs', chartType: 'architecture', desc: '系统架构图（Mermaid）', example: 'input: { dsl: "graph TD\\nA-->B" }', recommendedLayout: 'fullwidth' },
    { domain: 'cs', chartType: 'uml', desc: 'UML 类图/时序图/用例图（PlantUML）', example: 'input: { code: "classDiagram\\nclass A" }', recommendedLayout: 'fullwidth' },
    { domain: 'cs', chartType: 'er', desc: 'ER 实体关系图（Mermaid）', example: 'input: { entities: [...], relations: [...] }', recommendedLayout: 'fullwidth' },
    { domain: 'cs', chartType: 'statemachine', desc: '状态机图（Mermaid）', example: 'input: { transitions: [{from:"A",to:"B"}] }', recommendedLayout: 'fullwidth' },
    { domain: 'cs', chartType: 'gantt', desc: '甘特图（Mermaid）', example: 'input: { tasks: [{name:"T1",start:"2024-01",end:"2024-03"}] }', recommendedLayout: 'fullwidth' },
    // math — 数学
    { domain: 'math', chartType: 'formula', desc: 'LaTeX 公式', example: 'input: { latex: "E = mc^2" }', note: 'layout: "inline" 适合公式', recommendedLayout: 'inline' },
    { domain: 'math', chartType: 'function', desc: '函数图像', example: 'input: { func: "sin(x)", range: [-3.14, 3.14] }', recommendedLayout: 'fullwidth' },
    { domain: 'math', chartType: 'geometry', desc: '几何图形', example: 'input: { shapes: [...] }', recommendedLayout: 'halfwidth' },
    // physics — 物理（新增 circuit）
    { domain: 'physics', chartType: 'formula', desc: '物理公式（LaTeX）', example: 'input: { latex: "F = ma" }', recommendedLayout: 'inline' },
    { domain: 'physics', chartType: 'banddiagram', desc: '能带图', example: 'input: { conductionBand: [], valenceBand: [], fermiLevel: 0.5 }', recommendedLayout: 'fullwidth' },
    { domain: 'physics', chartType: 'field', desc: '矢量场图', example: 'input: { Ux: [], Vy: [] }', recommendedLayout: 'fullwidth' },
    { domain: 'physics', chartType: 'circuit', desc: '电路图（schemdraw）', example: 'input: { circuitType: "basic", elements: [{type:"Resistor",label:"R1"}] }', recommendedLayout: 'halfwidth' },
    // ai — 人工智能
    { domain: 'ai', chartType: 'neuralnet', desc: '神经网络架构图', example: 'input: { layers: [5, 8, 6, 3], title: "..." }', note: 'layout: "standalone" 适合复杂架构', recommendedLayout: 'standalone' },
    { domain: 'ai', chartType: 'trainingcurve', desc: '训练曲线', example: 'input: { model: "resnet50", epochs: 90 }', recommendedLayout: 'fullwidth' },
    { domain: 'ai', chartType: 'heatmap', desc: '热图/混淆矩阵', example: 'input: { data: [[0.8,0.1],[0.1,0.9]], labels: ["A","B"] }', recommendedLayout: 'halfwidth' },
    { domain: 'ai', chartType: 'confusion', desc: '混淆矩阵（带百分比）', example: 'input: { data: [[0.8,0.1],[0.1,0.9]], labels: ["A","B"] }', recommendedLayout: 'halfwidth' },
    { domain: 'ai', chartType: 'pipeline', desc: 'AI 流程管道图', example: 'input: { stages: ["数据","训练","推理"] }', recommendedLayout: 'fullwidth' },
    // chip — 芯片
    { domain: 'chip', chartType: 'architecture', desc: '芯片架构图（D2）', example: 'input: { dsl: "..." }', recommendedLayout: 'fullwidth' },
    { domain: 'chip', chartType: 'timing', desc: '时序图', example: 'input: { signals: [{name:"CLK", wave:"010101"}] }', recommendedLayout: 'fullwidth' },
    { domain: 'chip', chartType: 'noc', desc: 'NoC 网络拓扑图', example: 'input: { topology: "mesh", nodes: [...], size: 4 }', recommendedLayout: 'fullwidth' },
    { domain: 'chip', chartType: 'circuit', desc: '电路图（schemdraw）', example: 'input: { circuitType: "basic", elements: [{type:"Resistor",label:"R1"}] }', recommendedLayout: 'halfwidth' },
    // network — 网络
    { domain: 'network', chartType: 'topology', desc: '网络拓扑图（Graphviz）', example: 'input: { nodes: ["R1","R2"], edges: [...] }', recommendedLayout: 'fullwidth' },
    { domain: 'network', chartType: 'protocolstack', desc: '协议栈图', example: 'input: { layers: ["应用","传输","网络"] }', recommendedLayout: 'fullwidth' },
    { domain: 'network', chartType: 'packet', desc: '数据包结构图', example: 'input: { fields: [{name:"Header",size:20}] }', recommendedLayout: 'fullwidth' },
    // manufacturing — 制造业
    { domain: 'manufacturing', chartType: 'process', desc: '制造流程图', example: 'input: { steps: ["切割","蚀刻","封装"] }', recommendedLayout: 'fullwidth' },
    { domain: 'manufacturing', chartType: 'spc', desc: '统计过程控制图', example: 'input: { data: [], ucl: 10, lcl: 2 }', recommendedLayout: 'fullwidth' },
    { domain: 'manufacturing', chartType: 'supplychain', desc: '供应链图', example: 'input: { nodes: ["供应商","工厂","客户"], flows: [...] }', recommendedLayout: 'fullwidth' },
    // chemistry — 化学
    { domain: 'chemistry', chartType: 'molecule', desc: '分子结构图', example: 'input: { smiles: "CCO" }', recommendedLayout: 'halfwidth' },
    { domain: 'chemistry', chartType: 'equation', desc: '化学方程式（LaTeX）', example: 'input: { latex: "2H_2 + O_2 \\\\rightarrow 2H_2O" }', recommendedLayout: 'inline' },
    // general — 通用
    { domain: 'general', chartType: 'mindmap', desc: '思维导图', example: 'input: { root: "中心", children: [...] }', recommendedLayout: 'standalone' },
    { domain: 'general', chartType: 'sankey', desc: '桑基图', example: 'input: { nodes: [...], flows: [...] }', recommendedLayout: 'standalone' },
    { domain: 'general', chartType: 'chart', desc: '柱状图/折线图/饼图', example: 'input: { chartType: "bar", labels: [...], values: [...] }', recommendedLayout: 'fullwidth' },
    { domain: 'general', chartType: 'table', desc: '数据表格（渲染为图片）', example: 'input: { headers: [...], rows: [...] }', recommendedLayout: 'fullwidth' },
  ];

  // 按领域分组
  const typesByDomain = {};
  for (const t of types) {
    if (!typesByDomain[t.domain]) typesByDomain[t.domain] = [];
    typesByDomain[t.domain].push(t);
  }

  return {
    message: '以下图表类型可直接在 desc 中使用。Agent 根据内容选择最直观的图表类型。',
    types,
    typesByDomain,
    layouts: {
      fullwidth: '占满页面宽度（默认，适合大多数图表）',
      inline: '行内小图（55%宽度，适合公式、小图）',
      halfwidth: '半宽（48%宽度，两图并排）',
      standalone: '独占一页（95%宽度，适合复杂架构图）',
    },
    templatesDir: path.resolve(__dirname, 'templates'),
  };
}

/**
 * 初始化 Skill 工作目录
 * 创建默认输出目录 pdf/
 * @returns {{ pdfDir: string, templatesDir: string }}
 */
function init() {
  const pdfDir = path.resolve(process.cwd(), 'pdf');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    console.log(`[pdf-reporter] Created output dir: ${pdfDir}`);
  }
  return {
    pdfDir,
    templatesDir: path.resolve(__dirname, 'templates'),
  };
}

/**
 * 从 context 生成安全的文件名
 * @param {string} context
 * @returns {string}
 */
function sanitizeFilename(context) {
  return context
    .replace(/[<>:"/\\|?*\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'report';
}

/**
 * 生成不重复的文件路径
 * @param {string} dir
 * @param {string} basename
 * @returns {string}
 */
function uniquePdfPath(dir, basename) {
  let pdfPath = path.join(dir, `${basename}.pdf`);
  if (!fs.existsSync(pdfPath)) return pdfPath;
  let i = 1;
  while (fs.existsSync(pdfPath)) {
    pdfPath = path.join(dir, `${basename}_${i}.pdf`);
    i++;
  }
  return pdfPath;
}

/**
 * 检查环境是否就绪，如缺失依赖返回明确的安装指引
 * @returns {{ok: boolean, error?: string, setupPath?: string}}
 */
function checkReady() {
  // 优先检查沙盒
  if (tdk.isSandboxReady && tdk.isSandboxReady()) {
    const sandboxPy = getPython();
    return {
      ok: true,
      pyInfo: {
        python: sandboxPy,
        version: 'sandbox',
        packages: { reportlab: true, pymupdf: true, matplotlib: true },
        missing: [],
      },
    };
  }

  // 回退到系统 Python 检查
  const pyInfo = checkPythonEnv();
  if (!pyInfo.ok) {
    const setupPath = path.join(__dirname, 'setup.js');
    return {
      ok: false,
      error: `PDF Reporter 依赖未就绪: ${pyInfo.error}\n\n` +
             `请运行以下命令安装依赖，然后重试:\n` +
             `  node "${setupPath}"`,
      setupPath,
    };
  }
  if (pyInfo.missing.length > 0) {
    const setupPath = path.join(__dirname, 'setup.js');
    return {
      ok: false,
      error: `PDF Reporter 缺少必需的 Python 包: ${pyInfo.missing.join(', ')}\n\n` +
             `请运行以下命令安装依赖，然后重试:\n` +
             `  node "${setupPath}"`,
      setupPath,
    };
  }
  return { ok: true, pyInfo };
}

/**
 * 将 newPdf 追加到 oldPdf 末尾，插入分隔页
 * @param {string} oldPdf 已存在的 PDF 路径
 * @param {string} newPdf 新生成的 PDF 路径
 * @param {string} pyExe Python 解释器路径
 * @returns {Promise<number>} 合并后的总页数
 */
async function mergePdfAppend(oldPdf, newPdf, pyExe) {
  const ts = new Date().toLocaleString('zh-CN');
  const script = `import fitz, sys
old_path, new_path, ts = sys.argv[1], sys.argv[2], sys.argv[3]
old_doc = fitz.open(old_path)
new_doc = fitz.open(new_path)

sep = fitz.open()
page = sep.new_page(width=595, height=842)
page.insert_text((297, 380), "追加报告", fontsize=18, color=(0.4,0.4,0.4), fontname="china-ss")
page.insert_text((297, 410), ts, fontsize=11, color=(0.6,0.6,0.6), fontname="china-ss")

old_doc.insert_pdf(sep)
old_doc.insert_pdf(new_doc)
tmp_path = old_path + '.tmp'
old_doc.save(tmp_path, garbage=4, deflate=True)
total = len(old_doc)
old_doc.close(); new_doc.close(); sep.close()
import os, shutil
shutil.move(tmp_path, old_path)
print(total)`;

  const res = await runPython(pyExe, ['-c', script, oldPdf, newPdf, ts], { timeout: 30000 });
  const pages = parseInt(res.stdout.trim(), 10);
  if (Number.isNaN(pages)) {
    console.warn('[pdf-reporter] 页数解析失败，返回 null');
    return null;
  }
  return pages;
}

/**
 * 生成 PDF 报告
 * @param {object} options
 * @param {string} options.context - 报告主题/标题
 * @param {array}  options.struct  - 报告结构数组
 * @param {array}  options.desc    - 图表描述数组
 * @param {string} [options.outputPath] - 输出路径（可选，默认 reports/YYYY-MM-DD_report.pdf）
 * @returns {Promise<{success: boolean, path: string, size: number, pages?: number, images: number}>}
 */
async function generatePdf(options) {
  const { context, struct, desc, outputPath } = options;

  if (!context || !Array.isArray(struct)) {
    throw new Error(
      'Missing required fields: context, struct. ' +
      'See templates/report-spec.example.json for input format.'
    );
  }

  // ── 0. 懒加载：检查依赖就绪 ─────────────────────────────────────
  let ready = checkReady();
  if (!ready.ok) {
    // 尝试自动初始化沙盒（零配置体验）
    if (tdk.setupSandbox) {
      try {
        console.log('[pdf-reporter] 依赖未就绪，尝试自动初始化沙盒...');
        await tdk.setupSandbox({ autoInstall: true, verbose: true });
        ready = checkReady(); // 重新检查
      } catch (e) {
        console.error('[pdf-reporter] 沙盒初始化失败:', e.message);
      }
    }
  }
  if (!ready.ok) {
    console.error('[pdf-reporter] ' + ready.error);
    throw new Error(ready.error);
  }

  const pyInfo = ready.pyInfo;
  const pyExe = pyInfo.python;

  // ── 1. 创建工作目录 ─────────────────────────────────────────────
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-'));
  console.log(`[pdf-reporter] Work dir: ${workDir}`);
  console.log(`[pdf-reporter] Python: ${pyExe} (v${pyInfo.version})`);

  let images = {};
  let tempPdfPath = null;
  let isAppend = false;
  let originalPdfPath = null;

  try {
    // ── 2. 渲染所有图表 ───────────────────────────────────────────
    const diagramDescs = desc || [];

    if (diagramDescs.length > 0) {
      console.log(`[pdf-reporter] Rendering ${diagramDescs.length} diagram(s)...`);
    }

    for (const d of diagramDescs) {
      const id = d.id;
      if (!id) {
        console.warn('[pdf-reporter] Skipping diagram without id');
        continue;
      }

      const outputFile = path.join(workDir, `${id}.png`);
      const renderOptions = {
        domain: d.domain,
        type: d.chartType || d.type,
        input: d.input || {},
        format: d.format || 'png',
        dpi: d.dpi || 200,
        outputPath: outputFile,
      };

      try {
        const result = await tdk.render(renderOptions);
        if (result.success) {
          images[id] = result.path;
          console.log(`  [OK] ${id}: ${path.basename(result.path)} (${result.size} bytes)`);
        } else {
          console.warn(`  [FAIL] ${id}: render failed`);
        }
      } catch (e) {
        console.warn(`  [FAIL] ${id}: ${e.message}`);
      }
    }

    // ── 3. 构建 report.json ───────────────────────────────────────
    const report = {
      title: context,
      content: [],
    };

    for (const item of struct) {
      const kind = item.type;

      // 普通类型直接透传
      if (['cover', 'heading', 'paragraph', 'bullet', 'summary', 'pagebreak', 'table'].includes(kind)) {
        report.content.push(item);
        continue;
      }

      // diagram 占位符 → 替换为 image
      if (kind === 'diagram' || kind === 'image') {
        const refId = item.ref || item.id;
        const imgPath = images[refId];

        if (!imgPath) {
          console.warn(`  [WARN] Diagram ref not found: ${refId}, skipping`);
          report.content.push({
            type: 'paragraph',
            text: `[图表未渲染: ${refId}]`,
          });
          continue;
        }

        report.content.push({
          type: 'image',
          path: imgPath,
          layout: item.layout || 'fullwidth',
          caption: item.caption || '',
          dpi: item.dpi || 200,
        });
        continue;
      }

      // 未知类型透传
      report.content.push(item);
    }

    const jsonPath = path.join(workDir, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[pdf-reporter] report.json written: ${jsonPath}`);

    // ── 4. 调用 Python pdf_assembler 生成 PDF ─────────────────────
    let pdfPath;

    if (outputPath) {
      // Agent 指定了输出路径
      originalPdfPath = path.resolve(outputPath);
      pdfPath = originalPdfPath;
      if (fs.existsSync(pdfPath)) {
        // 追加前校验：文件必须非空且可访问
        const stat = fs.statSync(pdfPath);
        if (stat.size === 0) {
          // 空文件视为不存在，直接覆盖
          console.warn('[pdf-reporter] Target PDF is empty, treating as non-existent');
        } else if (pyInfo.packages.pymupdf) {
          isAppend = true;
          tempPdfPath = path.join(workDir, '_new_content.pdf');
          pdfPath = tempPdfPath;
        } else {
          // pymupdf 不可用 → 回退到 uniquePdfPath
          const dir = path.dirname(originalPdfPath);
          const base = path.basename(originalPdfPath, '.pdf');
          pdfPath = uniquePdfPath(dir, base);
          console.log(`[pdf-reporter] Output exists, pymupdf unavailable, fallback to ${pdfPath}`);
        }
      }
    } else {
      // 默认路径: ./pdf/{context摘要}.pdf，自动处理重名
      const pdfDir = path.resolve(process.cwd(), 'pdf');
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const basename = sanitizeFilename(context);
      pdfPath = uniquePdfPath(pdfDir, basename);
    }
    const pdfPy = path.join(TDK_DIR, 'src/pdf/py/pdf_assembler.py');

    // 确保输出目录存在
    const outDir = path.dirname(pdfPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`[pdf-reporter] Assembling PDF -> ${pdfPath}`);

    // 使用 compat.runPython 进行健壮调用
    const pyResult = await runPython(pyExe, [
      pdfPy,
      jsonPath,    // report.json 路径
      pdfPath,     // 输出 PDF 路径
    ], {
      cwd: TDK_DIR,
      env: { TDK_DIR },
      timeout: 120000,  // PDF 组装最多 2 分钟
    });

    // Python 输出到 stdout，打印出来便于调试
    if (pyResult.stdout) {
      console.log(pyResult.stdout.trim());
    }

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file was not generated');
    }

    // ── 5. PDF 追加逻辑 (FR-007) ───────────────────────────────────
    let pages = null;
    if (isAppend && tempPdfPath) {
      const totalPages = await mergePdfAppend(originalPdfPath, tempPdfPath, pyExe);
      if (totalPages !== null) {
        pages = totalPages;
      }
      pdfPath = originalPdfPath;
    }

    const stats = fs.statSync(pdfPath);
    const size = stats.size;

    // ── 6. 读取页数（可选，非追加模式）───────────────────────────────
    if (!isAppend && pyInfo.packages.pymupdf) {
      try {
        const countScript = `import fitz, sys; doc = fitz.open(sys.argv[1]); print(len(doc)); doc.close()`;
        const countResult = await runPython(pyExe, [
          '-c', countScript, pyPath(pdfPath),
        ], { timeout: 10000 });
        pages = parseInt(countResult.stdout.trim(), 10) || null;
      } catch (e) {
        console.warn('[pdf-reporter] 页数读取失败:', e.message);
      }
    }

    console.log(`[pdf-reporter] Done: ${pdfPath} (${(size/1024).toFixed(1)} KB${pages ? `, ${pages} pages` : ''})`);

    return {
      success: true,
      path: pdfPath,
      size,
      pages,
      images: Object.keys(images).length,
    };

  } catch (e) {
    console.error(`[pdf-reporter] Error: ${e.message}`);
    if (e.stderr) {
      console.error(`[pdf-reporter] Python stderr:\n${e.stderr}`);
    }
    throw e;
  } finally {
    // 清理追加模式临时文件
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try { fs.unlinkSync(tempPdfPath); } catch {}
    }
    // 清理工作目录
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

/**
 * 返回完整依赖清单（含沙盒/系统安装状态）
 * 供 Agent 查看当前环境能力
 */
function requireDependencyList() {
  if (!tdk.requireDependencyList) {
    throw new Error('TDK 版本过低，不支持依赖清单功能');
  }
  return tdk.requireDependencyList();
}

/**
 * 初始化沙盒环境并安装核心依赖
 * @param {object} options
 * @param {boolean} options.autoInstall - 是否自动安装 Tier 0 依赖（默认 true）
 */
async function setupSandbox(options = {}) {
  if (!tdk.setupSandbox) {
    throw new Error('TDK 版本过低，不支持沙盒功能');
  }
  return tdk.setupSandbox(options);
}

/**
 * 安装指定依赖到沙盒
 * @param {string} name - 依赖名（如 schemdraw, mathjax-node）
 */
async function installDependency(name) {
  if (!tdk.installDependency) {
    throw new Error('TDK 版本过低，不支持沙盒功能');
  }
  return tdk.installDependency(name);
}

module.exports = { generatePdf, init, listChartTypes, checkReady, requireDependencyList, setupSandbox, installDependency };
