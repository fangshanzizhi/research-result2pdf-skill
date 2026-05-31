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
 * 初始化 Skill 工作目录
 * 创建默认输出目录 reports/
 * @returns {{ reportsDir: string, templatesDir: string }}
 */
function init() {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log(`[pdf-reporter] Created output dir: ${reportsDir}`);
  }
  return {
    reportsDir,
    templatesDir: path.resolve(__dirname, 'templates'),
  };
}

/**
 * 检查环境是否就绪，如缺失依赖返回明确的安装指引
 * @returns {{ok: boolean, error?: string, setupPath?: string}}
 */
function checkReady() {
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
  return { ok: true };
}

/**
 * 生成 PDF 报告
 * @param {object} options
 * @param {string} options.context - 报告主题/标题
 * @param {array}  options.struct  - 报告结构数组
 * @param {array}  options.desc    - 图表描述数组
 * @param {string} [options.outputPath] - 输出路径（可选，默认 reports/YYYY-MM-DD_report.pdf）
 * @returns {Promise<{success: boolean, path: string, size: number, pages?: number}>}
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
  const ready = checkReady();
  if (!ready.ok) {
    console.error('[pdf-reporter] ' + ready.error);
    throw new Error(ready.error);
  }

  const pyExe = pyInfo.python;

  // ── 1. 创建工作目录 ─────────────────────────────────────────────
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-'));
  console.log(`[pdf-reporter] Work dir: ${workDir}`);
  console.log(`[pdf-reporter] Python: ${pyExe} (v${pyInfo.version})`);

  try {
    // ── 2. 渲染所有图表 ───────────────────────────────────────────
    const images = {};
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
    const defaultPdfName = `report_${new Date().toISOString().slice(0, 10)}.pdf`;
    const reportsDir = path.resolve(process.cwd(), 'reports');
    const pdfPath = path.resolve(
      outputPath || path.join(reportsDir, defaultPdfName)
    );
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

    const stats = fs.statSync(pdfPath);
    const size = stats.size;

    // ── 5. 读取页数（可选）─────────────────────────────────────────
    let pages = null;
    if (pyInfo.packages.pymupdf) {
      try {
        const countResult = await runPython(pyExe, [
          '-c',
          `import fitz; d=fitz.open(r'${pyPath(pdfPath)}'); print(len(d)); d.close()`,
        ], { timeout: 10000 });
        pages = parseInt(countResult.stdout.trim(), 10) || null;
      } catch (e) {
        console.warn('[pdf-reporter] 页数读取失败:', e.message);
      }
    }

    console.log(`[pdf-reporter] Done: ${pdfPath} (${(size/1024).toFixed(1)} KB${pages ? `, ${pages} pages` : ''})`);

    // ── 6. 清理临时文件（保留工作目录供调试）────────────────────────
    // 如需自动清理，取消下行注释：
    // fs.rmSync(workDir, { recursive: true, force: true });

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
  }
}

/**
 * CLI 入口 - 用于直接测试
 * 用法: node skill/pdf-reporter/index.js <report.json>
 */
async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node index.js <report.json> [output.pdf]');
    process.exit(1);
  }

  const outputPath = process.argv[3];
  const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const result = await generatePdf({
    context: spec.context || spec.title || '研究报告',
    struct: spec.struct || spec.content || [],
    desc: spec.desc || spec.diagrams || [],
    outputPath,
  });

  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { generatePdf, init };
