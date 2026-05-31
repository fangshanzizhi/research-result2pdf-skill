/**
 * Markmap 渲染器 (思维导图)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');

function render(payload) {
  const { input, format = 'svg', outputPath } = payload;
  const code = input.code || input.markdown || input;
  if (!code) throw new Error('Markmap 输入不能为空');

  const tmpMd = makeTempPath('.md');
  const fmt = format === 'html' ? 'html' : 'svg';
  const outPath = outputPath || makeTempPath(`.${fmt}`);

  fs.writeFileSync(tmpMd, code, 'utf-8');

  execSync(`markmap "${tmpMd}" -o "${outPath}" --no-open`, { stdio: 'pipe', timeout: 15000 });

  try { fs.unlinkSync(tmpMd); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: fmt, size: stats.size };
}

module.exports = { render };
