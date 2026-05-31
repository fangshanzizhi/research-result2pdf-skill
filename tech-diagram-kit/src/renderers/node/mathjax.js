/**
 * MathJax 渲染器 (mathjax-node)
 * 将 LaTeX 公式渲染为 SVG
 */
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');

// 延迟加载 mathjax-node，避免未安装时崩溃
let mjAPI = null;
function getMJ() {
  if (!mjAPI) {
    mjAPI = require('mathjax-node');
    mjAPI.config({
      MathJax: {
        SVG: { font: 'TeX', scale: 120 },
        tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
      }
    });
    mjAPI.start();
  }
  return mjAPI;
}

async function render(payload) {
  const { input, format = 'svg', outputPath, width, dpi = 200 } = payload;
  const latex = input.latex || input.code || input.formula || input;
  if (!latex) throw new Error('LaTeX 公式输入不能为空');

  const mj = getMJ();
  const outPath = outputPath || makeTempPath(format === 'svg' ? '.svg' : '.png');

  const result = await new Promise((resolve, reject) => {
    mj.typeset({
      math: latex,
      format: 'TeX',
      svg: true,
      png: format === 'png',
      dpi: dpi,
    }, (data) => {
      if (data.errors) reject(new Error(data.errors.join('; ')));
      else resolve(data);
    });
  });

  if (format === 'svg') {
    fs.writeFileSync(outPath, result.svg, 'utf-8');
  } else {
    if (!result.png) throw new Error('mathjax-node 未返回 PNG 数据');
    fs.writeFileSync(outPath, Buffer.from(result.png.replace(/^data:image\/png;base64,/, ''), 'base64'));
  }

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format, size: stats.size };
}

module.exports = { render };
