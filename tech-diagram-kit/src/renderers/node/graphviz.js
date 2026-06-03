/**
 * Graphviz 渲染器 (dot CLI) — 沙盒优先
 */
const { execSync } = require('child_process');
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');
const { findInSandbox } = require('../../core/sandbox');

function getDotExe() {
  const sandbox = findInSandbox('dot');
  if (sandbox) return sandbox;
  return 'dot';
}

function render(payload) {
  const { input, format = 'png', outputPath } = payload;
  const code = input.code || input.dot || input.dsl || input;
  if (!code || typeof code !== 'string') throw new Error('Graphviz DOT 输入必须是字符串');

  const tmpDot = makeTempPath('.dot');
  const fmt = format === 'pdf' ? 'pdf' : (format === 'svg' ? 'svg' : 'png');
  const outPath = outputPath || makeTempPath(`.${fmt}`);

  fs.writeFileSync(tmpDot, code, 'utf-8');

  const dotExe = getDotExe();
  execSync(`"${dotExe}" -T${fmt} "${tmpDot}" -o "${outPath}"`, { stdio: 'pipe', timeout: 15000 });

  try { fs.unlinkSync(tmpDot); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: fmt, size: stats.size };
}

module.exports = { render };
