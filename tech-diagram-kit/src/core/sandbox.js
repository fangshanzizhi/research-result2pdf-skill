/**
 * 沙盒环境管理器
 * 在项目根目录 .pdf-reporter/ 下创建隔离环境
 * 优先级: 沙盒 > 系统，确保隔离性与可复现性
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  SANDBOX_DIR, SANDBOX_VENV, SANDBOX_NODE_MODULES, SANDBOX_BIN, SANDBOX_STATE,
  ensureDir,
} = require('../utils/paths');

// ============================================================================
// 路径计算（跨平台）
// ============================================================================

function getVenvPython(venvDir) {
  const isWin = process.platform === 'win32';
  const pythonName = isWin ? 'python.exe' : 'python3';
  const subdir = isWin ? 'Scripts' : 'bin';
  return path.join(venvDir, subdir, pythonName);
}

function getVenvPip(venvDir) {
  const isWin = process.platform === 'win32';
  const pipName = isWin ? 'pip.exe' : 'pip';
  const subdir = isWin ? 'Scripts' : 'bin';
  return path.join(venvDir, subdir, pipName);
}

// ============================================================================
// 沙盒目录管理
// ============================================================================

function getSandboxDir() {
  return SANDBOX_DIR;
}

function ensureSandboxDir() {
  ensureDir(SANDBOX_DIR);
  ensureDir(SANDBOX_BIN);
  return SANDBOX_DIR;
}

function getSandboxBin() {
  ensureDir(SANDBOX_BIN);
  return SANDBOX_BIN;
}

function getSandboxNodeBin() {
  ensureDir(SANDBOX_NODE_MODULES);
  return path.join(SANDBOX_NODE_MODULES, '.bin');
}

// ============================================================================
// Python 查找（沙盒优先）
// ============================================================================

/**
 * 获取沙盒中的 Python 解释器路径
 * @returns {string|null} 沙盒 Python 路径，未初始化返回 null
 */
function getSandboxPython() {
  const venvPy = getVenvPython(SANDBOX_VENV);
  if (fs.existsSync(venvPy)) return venvPy;
  return null;
}

/**
 * 获取系统 Python（复用 compat.js 策略）
 * 内嵌简化版，避免循环依赖
 */
function findSystemPython() {
  // 环境变量
  if (process.env.TDK_PYTHON && fs.existsSync(process.env.TDK_PYTHON)) {
    return path.resolve(process.env.TDK_PYTHON);
  }

  // Windows 硬编码路径
  if (process.platform === 'win32') {
    const candidates = [
      'D:\\ProgramFiles\\Anaconda3\\envs\\fintech2\\python.exe',
      'D:\\ProgramFiles\\Anaconda3\\python.exe',
      'C:\\Users\\lenovo\\Anaconda3\\python.exe',
      'C:\\ProgramData\\Anaconda3\\python.exe',
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return path.resolve(c);
    }
  }

  // Shell 查找
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
  } catch { /* ignore */ }

  return null;
}

/**
 * 获取可用的 Python（沙盒优先）
 * @returns {string|null}
 */
function getPython() {
  return getSandboxPython() || findSystemPython();
}

/**
 * 验证 Python 版本 >= 3.8
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
      return { ok: false, error: `Python ${major}.${minor} 版本过低（需要 >= 3.8）` };
    }
    return { ok: true, version: `${major}.${minor}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================================
// 沙盒状态管理
// ============================================================================

function readState() {
  if (!fs.existsSync(SANDBOX_STATE)) return {};
  try {
    const raw = fs.readFileSync(SANDBOX_STATE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeState(state) {
  ensureDir(SANDBOX_DIR);
  fs.writeFileSync(SANDBOX_STATE, JSON.stringify(state, null, 2), 'utf-8');
}

function isSandboxReady() {
  const python = getSandboxPython();
  if (!python) return false;
  const v = validatePython(python);
  if (!v.ok) return false;
  const state = readState();
  return state.ready === true;
}

// ============================================================================
// CLI 工具查找（沙盒优先）
// ============================================================================

/**
 * 在沙盒中查找可执行文件
 * @param {string} cmd — 命令名（不含扩展名）
 * @returns {string|null} 完整路径或 null
 */
function findInSandbox(cmd) {
  const isWin = process.platform === 'win32';
  const ext = isWin ? '.exe' : '';
  const cmdExt = isWin ? '.cmd' : '';

  // 1. 沙盒 node_modules/.bin/
  const nodeBin = getSandboxNodeBin();
  const nodePaths = [
    path.join(nodeBin, cmd + ext),
    path.join(nodeBin, cmd + cmdExt),
    path.join(nodeBin, cmd),
  ];
  for (const p of nodePaths) {
    if (fs.existsSync(p)) return p;
  }

  // 2. 沙盒 bin/
  const binPaths = [
    path.join(SANDBOX_BIN, cmd + ext),
    path.join(SANDBOX_BIN, cmd + cmdExt),
    path.join(SANDBOX_BIN, cmd),
  ];
  for (const p of binPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

module.exports = {
  // 路径
  getSandboxDir,
  ensureSandboxDir,
  getSandboxBin,
  getSandboxNodeBin,
  SANDBOX_DIR,
  SANDBOX_VENV,
  SANDBOX_NODE_MODULES,
  SANDBOX_BIN,

  // Python
  getVenvPython,
  getVenvPip,
  getSandboxPython,
  findSystemPython,
  getPython,
  validatePython,

  // 状态
  readState,
  writeState,
  isSandboxReady,

  // CLI 查找
  findInSandbox,
};
