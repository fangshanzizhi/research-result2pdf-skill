/**
 * PDF 集成测试 - 验证 TDK + ReportLab 整合
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Test: PDF Integration ===');

const tdkDir = path.resolve(__dirname, '../..');
const exampleDir = path.join(tdkDir, 'docs/examples');
const outputDir = path.join(tdkDir, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// 设置环境变量
process.env.TDK_DIR = tdkDir;

const reportJson = path.join(exampleDir, 'report_demo.json');
const outputPdf = path.join(outputDir, 'tdk_integration_demo.pdf');

const pyPath = path.join(tdkDir, 'src/pdf/py/pdf_assembler.py');
const pythonExe = 'D:/ProgramFiles/Anaconda3/envs/fintech2/python.exe';

console.log('TDK Dir:', tdkDir);
console.log('Report JSON:', reportJson);
console.log('Output PDF:', outputPdf);

// 先验证 bin/tdk-render.js 可调用
console.log('\n--- Step 1: Verify TDK CLI ---');
try {
  const r = execSync(`node "${path.join(tdkDir, 'bin/tdk-render.js')}" '{"domain":"math","type":"formula","input":{"latex":"E=mc^2"},"format":"png","outputPath":"${path.join(outputDir, 'cli_test.png').replace(/\\/g, '\\')}","dpi":150}'`, {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: tdkDir,
  });
  const result = JSON.parse(r.trim().split('\n').pop());
  if (result.success) {
    console.log('✅ TDK CLI OK:', result.path, `(${result.size} bytes)`);
  } else {
    console.log('❌ TDK CLI failed:', result.error);
  }
} catch (e) {
  console.log('❌ TDK CLI error:', e.message);
  if (e.stdout) console.log('stdout:', e.stdout.toString());
  if (e.stderr) console.log('stderr:', e.stderr.toString());
}

// 运行 PDF 组装器
console.log('\n--- Step 2: Build PDF Report ---');
try {
  const cmd = `"${pythonExe}" "${pyPath}" "${reportJson}" "${outputPdf}"`;
  console.log('Command:', cmd);
  execSync(cmd, {
    stdio: 'inherit',
    timeout: 120000,
    cwd: tdkDir,
    env: { ...process.env, TDK_DIR: tdkDir },
  });

  if (fs.existsSync(outputPdf)) {
    const size = fs.statSync(outputPdf).size;
    console.log(`\n✅ PDF generated: ${outputPdf} (${(size/1024).toFixed(1)} KB)`);
  }
} catch (e) {
  console.log('\n❌ PDF build failed:', e.message);
}

console.log('\n=== PDF Integration Test Completed ===');
