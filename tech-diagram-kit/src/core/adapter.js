/**
 * Python 渲染器适配器（沙盒优先 + 系统回退版）
 * 通过子进程 JSON 协议调用 Python 渲染脚本
 * 当沙盒缺少渲染器依赖时，自动回退到系统 Python
 */
const { spawn } = require('child_process');
const path = require('path');
const { TdkError, ErrorCode } = require('../utils/errors');
const { RENDERERS_PY_DIR } = require('../utils/paths');
const { getSandboxPython, findSystemPython } = require('./sandbox');

const DEFAULT_TIMEOUT = 30000; // 30s

function isImportError(stderr) {
  if (!stderr) return false;
  const s = stderr.toLowerCase();
  return s.includes('no module named') ||
         s.includes('modulenotfounderror') ||
         s.includes('importerror');
}

function callPythonWithExe(pythonExe, rendererName, payload, timeout) {
  const scriptPath = path.join(RENDERERS_PY_DIR, `${rendererName}.py`);

  return new Promise((resolve, reject) => {
    const args = [scriptPath];
    const child = spawn(pythonExe, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      reject(new TdkError(ErrorCode.TIMEOUT, `Python renderer "${rendererName}" 超时 (${timeout}ms)`));
    }, timeout);

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new TdkError(ErrorCode.RENDER_FAILED, `无法启动 Python 渲染器: ${err.message}`, { renderer: rendererName }));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code !== 0) {
        reject(new TdkError(ErrorCode.RENDER_FAILED,
          `Python renderer "${rendererName}" 退出码 ${code}: ${stderr.trim()}`,
          { stderr: stderr.trim() }));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new TdkError(ErrorCode.RENDER_FAILED,
          `Python renderer 输出解析失败: ${e.message}\n输出: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

async function callPython(rendererName, payload, options = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;

  // 候选 Python：沙盒优先，系统回退
  const candidates = [getSandboxPython(), findSystemPython()].filter(Boolean);

  if (candidates.length === 0) {
    throw new TdkError(ErrorCode.DEPENDENCY_MISSING,
      '未找到可用的 Python 解释器。请安装 Python 3.8+ 或运行 setupSandbox()');
  }

  let lastResult = null;
  for (const pythonExe of candidates) {
    const result = await callPythonWithExe(pythonExe, rendererName, payload, timeout);

    // 成功直接返回
    if (result && result.success) {
      return result;
    }

    // 失败：检查是否是 ImportError（沙盒缺少依赖）
    const errText = (result?.error || '') + ' ' + (result?.stderr || '');
    if (isImportError(errText)) {
      lastResult = result;
      continue; // 尝试下一个 Python
    }

    // 其他错误，直接返回失败结果（让 engine.js 处理）
    return result;
  }

  // 所有候选都因 ImportError 失败
  throw new TdkError(ErrorCode.RENDER_FAILED,
    lastResult?.error || '所有 Python 环境均缺少该渲染器依赖');
}

module.exports = { callPython };
