/**
 * Python 渲染器适配器
 * 通过子进程 JSON 协议调用 Python 渲染脚本
 */
const { spawn } = require('child_process');
const path = require('path');
const { TdkError, ErrorCode } = require('../utils/errors');
const { RENDERERS_PY_DIR } = require('../utils/paths');

const DEFAULT_TIMEOUT = 30000; // 30s

function findPython() {
  // 1. 环境变量优先
  if (process.env.TDK_PYTHON) return process.env.TDK_PYTHON;
  // 2. Windows 常见 Anaconda 路径
  if (process.platform === 'win32') {
    const candidates = [
      'D:\\ProgramFiles\\Anaconda3\\envs\\fintech2\\python.exe',
      'C:\\Users\\lenovo\\Anaconda3\\python.exe',
      'C:\\Users\\lenovo\\miniconda3\\python.exe',
    ];
    for (const c of candidates) {
      try { require('fs').accessSync(c); return c; } catch {}
    }
  }
  // 3. 默认
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function callPython(rendererName, payload, options = {}) {
  const scriptPath = path.join(RENDERERS_PY_DIR, `${rendererName}.py`);
  const { timeout = DEFAULT_TIMEOUT } = options;

  return new Promise((resolve, reject) => {
    const args = [scriptPath];
    const pythonExe = findPython();
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
        reject(new TdkError(ErrorCode.RENDER_FAILED, `Python renderer "${rendererName}" 退出码 ${code}: ${stderr.trim()}`, { stderr: stderr.trim() }));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new TdkError(ErrorCode.RENDER_FAILED, `Python renderer 输出解析失败: ${e.message}\n输出: ${stdout.slice(0, 500)}`));
      }
    });
  });
}

module.exports = { callPython };
