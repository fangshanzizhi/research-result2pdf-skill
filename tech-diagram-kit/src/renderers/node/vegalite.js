/**
 * Vega-Lite 渲染器
 */
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');

// 延迟加载可选依赖
let vega, vegaLite, createCanvas;
function loadDeps() {
  if (!vega) vega = require('vega');
  if (!vegaLite) vegaLite = require('vega-lite');
  if (!createCanvas) createCanvas = require('canvas').createCanvas;
}

async function render(payload) {
  loadDeps();
  const { input, format = 'png', outputPath, width = 600 } = payload;
  const spec = input.spec || input.vegalite || input;
  if (!spec) throw new Error('Vega-Lite spec 输入不能为空');

  const outPath = outputPath || makeTempPath(format === 'svg' ? '.svg' : '.png');

  // Compile Vega-Lite to Vega
  const vgSpec = vegaLite.compile(spec).spec;
  const runtime = vega.parse(vgSpec);

  if (format === 'svg') {
    const view = new vega.View(runtime, { renderer: 'none' });
    const svg = await view.toSVG();
    fs.writeFileSync(outPath, svg, 'utf-8');
  } else {
    const canvas = createCanvas(width, width * 0.6);
    const view = new vega.View(runtime, {
      renderer: 'canvas',
      canvas: canvas,
      width,
      height: width * 0.6,
    });
    await view.runAsync();
    const stream = canvas.createPNGStream();
    const out = fs.createWriteStream(outPath);
    stream.pipe(out);
    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });
  }

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format, size: stats.size };
}

module.exports = { render };
