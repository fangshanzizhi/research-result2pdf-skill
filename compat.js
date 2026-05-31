/**
 * Node.js ↔ Python 兼容性桥接层
 * 处理跨语言调用的所有脆弱点：
 *   1. Python 解释器检测（多策略回退）
 *   2. 命令行参数安全编码
 *   3. 子进程健壮封装
 *   4. Python 环境预检
 */

const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

// ─────────────────────────────────────────────────────────────────
// 1. Python 解释器检测
// ─────────────────────────────────────────────────────────────────

const DEFAULT_WIN_PATHS = [
  'D:\\ProgramFiles\\Anaconda3\\envs\\fintech2\\python.exe',
  'D:\\ProgramFiles\\Anaconda3\\python.exe',
  'C:\\Users\\lenovo\\Anaconda3\\python.exe',
  'C:\\ProgramData\\Anaconda3\\python.exe',
  'C:\\Users\\lenovo\\.conda\\envs\\fintech2\\python.exe',
];

/**
 * 多策略查找可用的 Python 解释器
 * @returns {string|null} Python 可执行文件绝对路径
 */
function findPython() {
  // 策略 0: 环境变量
  if (process.env.TDK_PYTHON) {
    if (fs.existsSync(process.env.TDK_PYTHON)) {
      return path.resolve(process.env.TDK_PYTHON);
    }
  }

  // 策略 1: 硬编码常用路径（Windows）
  if (process.platform === 'win32') {
    for (const p of DEFAULT_WIN_PATHS) {
      if (fs.existsSync(p)) return path.resolve(p);
    }
  }

  // 策略 2: 通过 shell 命令查找
  const shellCmd = process.platform === 'win32'
    ? 'where python python3 2>nul'
    : 'which python3 python 2>/dev/null';

  try {
    const out = execSync(shellCmd, { encoding: 'utf-8', timeout: 3000 });
    const lines = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      const abs = path.resolve(line);
      if (fs.existsSync(abs)) return abs;
    }
  } catch {
    // 忽略
  }

  // 策略 3: PATH 中直接尝试
  const candidates = process.platform === 'win32'
    ? ['python.exe', 'python3.exe']
    : ['python3', 'python'];

  for (const name of candidates) {
    try {
      const out = execSync(
        process.platform === 'win32' ? `where ${name} 2>nul` : `which ${name} 2>/dev/null`,
        { encoding: 'utf-8', timeout: 3000 }
      );
      const p = out.split(/\r?\n/)[0].trim();
      if (p && fs.existsSync(p)) return path.resolve(p);
    } catch {
      // 忽略
    }
  }

  return null;
}

let _cachedPython = null;

function getPython() {
  if (!_cachedPython) {
    _cachedPython = findPython();
  }
  return _cachedPython;
}

/**
 * 验证 Python 是否可用（执行简单语句）
 */
function validatePython(pythonPath) {
  try {
    const out = execSync(
      `"${pythonPath}" -c "import sys; print(sys.version_info[:2])"`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const match = out.match(/\((\d+),\s*(\d+)\)/);
    if (!match) return { ok: false, error: '无法解析 Python 版本' };
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major < 3 || (major === 3 && minor < 8)) {
      return { ok: false, error: `Python 版本过低: ${major}.${minor} (需要 >= 3.8)` };
    }
    return { ok: true, version: `${major}.${minor}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 检查 Python 包是否已安装
 */
function checkPyPackage(pythonPath, packageName) {
  try {
    execSync(
      `"${pythonPath}" -c "import ${packageName}"`,
      { encoding: 'utf-8', timeout: 5000, stdio: 'pipe' }
    );
    return { installed: true };
  } catch (e) {
    return { installed: false, error: e.stderr || e.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. 命令行安全编码
// ─────────────────────────────────────────────────────────────────

/**
 * 将字符串安全地编码为 Python 命令行参数
 * Windows: 用双引号 + 反斜杠转义
 * Unix: 用单引号 + 转义
 */
function shellEscape(str) {
  if (process.platform === 'win32') {
    // Windows: 双引号包裹，内部双引号转义为 \"
    return '"' + str.replace(/"/g, '\\"').replace(/\\/g, '\\\\') + '"';
  }
  // Unix: 单引号包裹，内部单引号转义为 '\''
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * 将路径转换为 Python 友好的格式
 * Windows 上可能含反斜杠，用 raw string 或正斜杠
 */
function pyPath(filePath) {
  // 使用正斜杠，Python 在 Windows 上也支持
  return filePath.replace(/\\/g, '/');
}

// ─────────────────────────────────────────────────────────────────
// 3. 健壮的子进程封装
// ─────────────────────────────────────────────────────────────────

/**
 * 执行 Python 脚本并返回输出
 * @param {string} pythonPath - Python 可执行文件路径
 * @param {string[]} args - 参数列表（会被安全处理）
 * @param {object} options - 额外选项
 */
async function runPython(pythonPath, args, options = {}) {
  const { cwd, env = {}, timeout = 60000 } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, args, {
      cwd,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows 上如果 Python 路径包含空格，spawn 本身能处理（传数组时不需要 shell）
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Python process timed out after ${timeout}ms`));
    }, timeout);

    child.on('error', err => {
      clearTimeout(timer);
      reject(new Error(`Failed to start Python: ${err.message}`));
    });

    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        const err = new Error(
          `Python exited with code ${code}\n` +
          `STDOUT:\n${stdout.slice(-2000)}\n` +
          `STDERR:\n${stderr.slice(-2000)}`
        );
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr, code });
      }
    });
  });
}

/**
 * 执行单行 Python 命令并返回输出
 */
async function runPythonExpr(pythonPath, code, options = {}) {
  const escaped = code.includes('"')
    ? `"${pythonPath}" -c '${code.replace(/'/g, "'\\''")}'`
    : `"${pythonPath}" -c "${code}"`;

  return new Promise((resolve, reject) => {
    execSync(escaped, {
      encoding: 'utf-8',
      timeout: options.timeout || 10000,
      cwd: options.cwd,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...options.env },
    });
    resolve();
  });
}

// ─────────────────────────────────────────────────────────────────
// 4. 环境预检（一次性）
// ─────────────────────────────────────────────────────────────────

/**
 * 完整的 Python 环境检查报告
 */
function checkPythonEnv() {
  const python = getPython();
  if (!python) {
    return {
      ok: false,
      error: '未找到可用的 Python 解释器。请设置 TDK_PYTHON 环境变量或安装 Python 3.8+',
    };
  }

  const pyCheck = validatePython(python);
  if (!pyCheck.ok) {
    return { ok: false, python, error: pyCheck.error };
  }

  const reportlab = checkPyPackage(python, 'reportlab');
  const pymupdf = checkPyPackage(python, 'pymupdf');

  return {
    ok: true,
    python,
    version: pyCheck.version,
    packages: {
      reportlab: reportlab.installed,
      pymupdf: pymupdf.installed,
    },
    missing: [
      !reportlab.installed && 'reportlab (pip install reportlab)',
      !pymupdf.installed && 'pymupdf (pip install pymupdf) [可选]',
    ].filter(Boolean),
  };
}

module.exports = {
  findPython,
  getPython,
  validatePython,
  checkPyPackage,
  shellEscape,
  pyPath,
  runPython,
  runPythonExpr,
  checkPythonEnv,
};
