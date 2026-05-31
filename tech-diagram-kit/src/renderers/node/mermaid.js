/**
 * Mermaid 渲染器 (mmdc CLI)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { makeTempPath } = require('../../utils/paths');

function render(payload) {
  const { input, format = 'png', outputPath, width } = payload;
  const code = input.code || input.dsl || input;
  if (!code) throw new Error('Mermaid 输入不能为空');

  const isSvg = format === 'svg';
  const tmpMmd = makeTempPath('.mmd');
  const outPath = outputPath || makeTempPath(isSvg ? '.svg' : '.png');

  fs.writeFileSync(tmpMmd, code, 'utf-8');

  const args = [
    'mmdc',
    '-i', tmpMmd,
    '-o', outPath,
    '-b', 'transparent'
  ];
  if (!isSvg) args.push('-s', '2'); // 2x scale for PNG

  execSync(args.join(' '), { stdio: 'pipe', timeout: 15000 });

  // cleanup
  try { fs.unlinkSync(tmpMmd); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: isSvg ? 'svg' : 'png', size: stats.size };
}

module.exports = { render };
