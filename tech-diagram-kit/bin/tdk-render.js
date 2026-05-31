#!/usr/bin/env node
/**
 * TDK CLI 入口 - 供 Python PDF 组装器调用
 * 用法: node bin/tdk-render.js '<json_payload>'
 * 输出: JSON { success, path, format, size }
 */
const path = require('path');

// 确保能找到 src 模块
const srcDir = path.resolve(__dirname, '../src');
process.chdir(path.resolve(__dirname, '..'));

const { render } = require(path.join(srcDir, 'core/engine'));

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: node tdk-render.js \'<json_payload>\'');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: `JSON parse error: ${e.message}` }));
    process.exit(1);
  }

  try {
    const result = await render(payload);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({
      success: false,
      error: e.message,
      code: e.code || 'RENDER_FAILED',
      details: e.details || {},
    }));
  }
}

main();
