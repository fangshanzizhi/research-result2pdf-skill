/**
 * D2 渲染器
 */
const { execSync } = require('child_process');
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');

function render(payload) {
  const { input, format = 'svg', outputPath } = payload;
  const code = input.code || input.dsl || input;
  if (!code) throw new Error('D2 输入不能为空');

  const tmpD2 = makeTempPath('.d2');
  const isSvg = format === 'svg';
  const outPath = outputPath || makeTempPath(isSvg ? '.svg' : '.png');

  fs.writeFileSync(tmpD2, code, 'utf-8');

  const fmt = isSvg ? 'svg' : 'png';
  execSync(`d2 "${tmpD2}" "${outPath}" --layout elk --theme 200`, {
    stdio: 'pipe', timeout: 15000
  });

  try { fs.unlinkSync(tmpD2); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: fmt, size: stats.size };
}

module.exports = { render };
