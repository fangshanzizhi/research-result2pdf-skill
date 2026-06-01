/**
 * PDF Reporter Skill - CLI 入口
 * 用于直接测试，通过命令行传入 report.json 生成 PDF
 *
 * 用法:
 *   node bin/cli.js <report.json> [output.pdf]
 */

const path = require('path');
const fs = require('fs');

// 确保从 skill 根目录加载
const skillDir = path.resolve(__dirname, '..');
const { generatePdf } = require(path.join(skillDir, 'index.js'));

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node bin/cli.js <report.json> [output.pdf]');
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

main().catch(e => {
  console.error(e);
  process.exit(1);
});
