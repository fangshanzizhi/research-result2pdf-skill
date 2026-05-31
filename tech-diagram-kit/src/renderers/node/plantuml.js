/**
 * PlantUML 渲染器
 */
const { execSync } = require('child_process');
const fs = require('fs');
const { makeTempPath } = require('../../utils/paths');

function render(payload) {
  const { input, format = 'png', outputPath } = payload;
  const code = input.code || input.dsl || input;
  if (!code) throw new Error('PlantUML 输入不能为空');

  const tmpPuml = makeTempPath('.puml');
  const fmt = format === 'svg' ? 'svg' : 'png';
  const outPath = outputPath || makeTempPath(`.${fmt}`);

  fs.writeFileSync(tmpPuml, code, 'utf-8');

  // 优先尝试 plantuml 命令，回退到 java -jar
  try {
    execSync(`plantuml -t${fmt} "${tmpPuml}" -o "${path.dirname(outPath)}"`, { stdio: 'pipe', timeout: 20000 });
  } catch {
    execSync(`java -jar plantuml.jar -t${fmt} "${tmpPuml}" -o "${path.dirname(outPath)}"`, { stdio: 'pipe', timeout: 20000 });
  }

  try { fs.unlinkSync(tmpPuml); } catch (e) {}

  const stats = fs.statSync(outPath);
  return { success: true, path: outPath, format: fmt, size: stats.size };
}

module.exports = { render };
