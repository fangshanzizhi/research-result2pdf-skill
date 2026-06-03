/**
 * Mermaid 渲染器 (mmdc CLI) — 沙盒优先
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { makeTempPath } = require('../../utils/paths');
const { findInSandbox } = require('../../core/sandbox');

function getMmdcExe() {
  const sandbox = findInSandbox('mmdc');
  if (sandbox) return sandbox;
  return 'mmdc';
}

function render(payload) {
  const { input, format = 'png', outputPath, width } = payload;
  const code = input.code || input.dsl || input;
  if (!code || typeof code !== 'string') throw new Error('Mermaid 输入必须是字符串');

  const isSvg = format === 'svg';
  const tmpMmd = makeTempPath('.mmd');
  const outPath = outputPath || makeTempPath(isSvg ? '.svg' : '.png');

  fs.writeFileSync(tmpMmd, code, 'utf-8');

  const mmdcExe = getMmdcExe();
  const args = [
    '"' + mmdcExe + '"',
    '-i', '"' + tmpMmd + '"',
    '-o', '"' + outPath + '"',
    '-b', 'transparent'
  ];
  if (!isSvg) args.push('-s', '2'); // 2x scale for PNG

  execSync(args.join(' '), { stdio: 'pipe', timeout: 60000 });

  // cleanup
  try { fs.unlinkSync(tmpMmd); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: isSvg ? 'svg' : 'png', size: stats.size };
}

module.exports = { render };
