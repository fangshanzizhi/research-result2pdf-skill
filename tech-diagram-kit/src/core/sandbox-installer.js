/**
 * 沙盒安装执行器
 * 负责创建 venv、pip install、npm install 等实际操作
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  getSandboxDir, ensureSandboxDir, getVenvPython, getVenvPip,
  getSandboxPython, findSystemPython, validatePython,
  readState, writeState, isSandboxReady,
} = require('./sandbox');
const { ensureDir } = require('../utils/paths');

// ============================================================================
// Tier 定义
// ============================================================================

const TIER_DEFINITIONS = {
  0: {
    name: '核心 Python 包',
    description: 'PDF 组装和基础图表渲染必需',
    autoInstall: true,
    type: 'python',
    packages: ['reportlab', 'matplotlib', 'numpy', 'pymupdf'],
  },
  1: {
    name: 'Python 渲染器',
    description: '可选图表渲染器',
    autoInstall: true,
    type: 'python',
    packages: ['schemdraw', 'rdkit'],
    // rdkit 通常需要 conda，pip 安装容易失败，标记为 bestEffort
    bestEffort: ['rdkit'],
  },
  2: {
    name: 'Node.js 包',
    description: 'Node.js 公式渲染 fallback',
    autoInstall: true,
    type: 'node',
    packages: ['mathjax-node'],
  },
  3: {
    name: 'CLI 工具',
    description: '命令行图表渲染工具',
    autoInstall: true,
    type: 'cli',
    packages: ['mermaid-cli', 'd2', 'graphviz'],
    // npm 可直接安装的 CLI 工具
    npmPackages: {
      'mermaid-cli': '@mermaid-js/mermaid-cli',
      'd2': null,        // npm 无 d2 包，需手动下载
      'graphviz': null,  // npm 无 graphviz 包，需手动下载
    },
    // 标记为 bestEffort：安装失败不阻塞整体流程
    bestEffort: ['d2', 'graphviz'],
  },
};

// 反向查找：依赖名 -> Tier
const DEP_TO_TIER = {};
for (const [tierNum, tier] of Object.entries(TIER_DEFINITIONS)) {
  for (const pkg of tier.packages) {
    DEP_TO_TIER[pkg] = parseInt(tierNum, 10);
  }
}

// ============================================================================
// 底层执行
// ============================================================================

function exec(cmd, opts = {}) {
  const { timeout = 120000, cwd, env } = opts;
  return execSync(cmd, {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout,
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    shell: process.platform === 'win32',
  });
}

// ============================================================================
// 二进制下载与解压（CLI 工具自动安装）
// ============================================================================

const os = require('os');
const https = require('https');

function toUnixPath(p) {
  return p.replace(/\\/g, '/');
}

function downloadFile(url, destPath, timeout = 300000) {
  ensureDir(path.dirname(destPath));
  console.log(`[sandbox] 下载: ${path.basename(destPath)}`);

  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 跟随重定向
        downloadFile(res.headers.location, destPath, timeout).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        if (fs.statSync(destPath).size === 0) {
          reject(new Error(`下载为空: ${url}`));
        } else {
          resolve(destPath);
        }
      });
      file.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`下载超时: ${url}`));
    });
  });
}

function extractTarGz(tarPath, destDir, stripComponents = 1) {
  ensureDir(destDir);
  console.log(`[sandbox] 解压 tar.gz: ${path.basename(tarPath)}`);
  // --force-local: 防止 Windows 路径 C:\ 被 tar 解析为远程主机名
  const sc = stripComponents > 0 ? `--strip-components=${stripComponents}` : '';
  exec(`tar --force-local -xzf ${toUnixPath(tarPath)} -C ${toUnixPath(destDir)} ${sc}`, { timeout: 60000 });
}

function extractZip(zipPath, destDir) {
  ensureDir(destDir);
  console.log(`[sandbox] 解压 zip: ${path.basename(zipPath)}`);
  exec(`unzip -q -o ${toUnixPath(zipPath)} -d ${toUnixPath(destDir)}`, { timeout: 120000 });
}

function findExeInDir(dir, name) {
  const candidates = [
    path.join(dir, `${name}.exe`),
    path.join(dir, 'bin', `${name}.exe`),
    path.join(dir, `${name}`),
    path.join(dir, 'bin', `${name}`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function installD2(sandboxBinDir) {
  const isWin = process.platform === 'win32';
  if (!isWin) {
    // macOS/Linux: 尝试 brew / apt，或下载 tarball
    throw new Error('非 Windows 平台请手动安装 d2: https://d2lang.com/tour/install');
  }

  const version = 'v0.7.1';
  const filename = `d2-${version}-windows-amd64.tar.gz`;
  const url = `https://github.com/terrastruct/d2/releases/download/${version}/${filename}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdk-d2-'));
  const tarPath = path.join(tmpDir, filename);

  try {
    await downloadFile(url, tarPath);
    extractTarGz(tarPath, tmpDir, 1);
    const d2Exe = findExeInDir(tmpDir, 'd2');
    if (!d2Exe) throw new Error('解压后未找到 d2.exe');
    fs.copyFileSync(d2Exe, path.join(sandboxBinDir, 'd2.exe'));
    console.log(`  ✓ d2 已安装到沙盒`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function installGraphviz(sandboxBinDir) {
  const isWin = process.platform === 'win32';
  if (!isWin) {
    throw new Error('非 Windows 平台请手动安装 graphviz: https://graphviz.org/download/');
  }

  // 使用 Graphviz 15.0.0 win64 zip
  const version = '15.0.0';
  const filename = `Graphviz-${version}-win64.zip`;
  const url = `https://gitlab.com/api/v4/projects/4207231/packages/generic/graphviz-releases/${version}/windows_10_cmake_Release_${filename}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdk-graphviz-'));
  const zipPath = path.join(tmpDir, filename);

  try {
    await downloadFile(url, zipPath, 300000); // 下载可能较慢
    extractZip(zipPath, tmpDir);
    // zip 解压后通常是 Graphviz-x.y.z-win64/ 目录
    const extractedDir = fs.readdirSync(tmpDir).find(d => d.includes('Graphviz'));
    const baseDir = extractedDir ? path.join(tmpDir, extractedDir) : tmpDir;
    const dotExe = findExeInDir(baseDir, 'dot');
    if (!dotExe) throw new Error('解压后未找到 dot.exe');
    fs.copyFileSync(dotExe, path.join(sandboxBinDir, 'dot.exe'));
    // 同时复制需要的 DLL
    const dlls = fs.readdirSync(path.dirname(dotExe)).filter(f => f.endsWith('.dll'));
    for (const dll of dlls) {
      fs.copyFileSync(path.join(path.dirname(dotExe), dll), path.join(sandboxBinDir, dll));
    }
    console.log(`  ✓ graphviz 已安装到沙盒`);
    // Windows 上 graphviz 需要运行 dot -c 注册输出格式插件
    try {
      exec(`"${path.join(sandboxBinDir, 'dot.exe')}" -c`);
      console.log(`  ✓ graphviz 插件已注册 (dot -c)`);
    } catch (e) {
      console.warn(`  ⚠ graphviz 插件注册失败: ${e.message}`);
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ============================================================================
// Python venv 创建
// ============================================================================

function createVenv(systemPython, sandboxDir) {
  const venvDir = path.join(sandboxDir, 'venv');
  if (fs.existsSync(venvDir)) {
    // 已存在，验证有效性
    const venvPy = getVenvPython(venvDir);
    if (fs.existsSync(venvPy)) {
      const v = validatePython(venvPy);
      if (v.ok) return venvPy;
    }
    // 无效，删除重建
    try { fs.rmSync(venvDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  console.log(`[sandbox] 创建 Python venv: ${venvDir}`);
  exec(`"${systemPython}" -m venv "${venvDir}"`, { timeout: 60000 });

  const venvPy = getVenvPython(venvDir);
  if (!fs.existsSync(venvPy)) {
    throw new Error(`venv 创建失败: ${venvPy} 不存在`);
  }

  // 升级 pip
  try {
    exec(`"${venvPy}" -m pip install --upgrade pip`, { timeout: 60000 });
  } catch {
    // 非致命，继续
  }

  return venvPy;
}

// ============================================================================
// pip install（沙盒）
// ============================================================================

function pipInstall(sandboxPython, packages, opts = {}) {
  const { upgrade = false, timeout = 300000 } = opts;
  const pkgs = Array.isArray(packages) ? packages : [packages];

  // 优先使用国内镜像，失败时回退官方源
  const mirrors = [
    'https://pypi.tuna.tsinghua.edu.cn/simple',
    'https://pypi.org/simple',
  ];

  let lastError = null;
  for (const mirror of mirrors) {
    try {
      let cmd = `"${sandboxPython}" -m pip install`;
      if (upgrade) cmd += ' --upgrade';
      cmd += ` --index-url ${mirror} --trusted-host ${mirror.replace(/^https?:\/\//, '')}`;
      cmd += ` ${pkgs.join(' ')}`;

      console.log(`[sandbox] pip install [${mirror}]: ${pkgs.join(', ')}`);
      const out = exec(cmd, { timeout });
      return out;
    } catch (e) {
      lastError = e;
      console.warn(`  ⚠ 镜像 ${mirror} 失败，尝试回退...`);
    }
  }
  throw lastError;
}

// ============================================================================
// npm install（沙盒局部）
// ============================================================================

function npmInstall(sandboxDir, packages, opts = {}) {
  const pkgs = Array.isArray(packages) ? packages : [packages];
  const nodeModulesDir = path.join(sandboxDir, 'node_modules');
  ensureDir(nodeModulesDir);

  let cmd = `npm install --prefix "${sandboxDir}" ${pkgs.join(' ')} --no-save --no-package-lock`;
  console.log(`[sandbox] npm install: ${pkgs.join(', ')}`);
  const out = exec(cmd, {
    timeout: 300000,
    env: {
      PUPPETEER_SKIP_DOWNLOAD: 'true',
      PUPPETEER_SKIP_CHROME_DOWNLOAD: 'true',
    },
  });
  return out;
}

// ============================================================================
// 自动安装所有 autoInstall=true 的依赖
// ============================================================================

async function installAutoTiers(sandboxDir, systemPython) {
  const venvPy = createVenv(systemPython, sandboxDir);

  // 收集所有需要安装的依赖
  const pythonPkgs = [];
  const nodePkgs = [];
  const bestEffortSet = new Set();

  for (const [tierNum, tier] of Object.entries(TIER_DEFINITIONS)) {
    if (!tier.autoInstall) continue;

    const be = tier.bestEffort || [];
    for (const pkg of be) bestEffortSet.add(pkg);

    if (tier.type === 'python') {
      for (const pkg of tier.packages) {
        if (pkg !== 'rdkit') pythonPkgs.push(pkg); // rdkit 单独处理
      }
    } else if (tier.type === 'node') {
      nodePkgs.push(...tier.packages);
    } else if (tier.type === 'cli') {
      for (const [name, npmPkg] of Object.entries(tier.npmPackages || {})) {
        if (npmPkg) nodePkgs.push(npmPkg);
      }
    }
  }

  // 1. 升级 pip
  try {
    exec(`"${venvPy}" -m pip install --upgrade pip`, { timeout: 60000 });
  } catch {
    // 非致命
  }

  // 2. Python pip 批量安装（比逐个安装更稳定）
  if (pythonPkgs.length > 0) {
    const corePkgs = pythonPkgs.filter(p => !bestEffortSet.has(p));
    const bePkgs = pythonPkgs.filter(p => bestEffortSet.has(p));

    // 核心包批量安装
    if (corePkgs.length > 0) {
      try {
        pipInstall(venvPy, corePkgs);
        for (const pkg of corePkgs) {
          const importName = pkg === 'pymupdf' ? 'fitz' : pkg;
          try {
            exec(`"${venvPy}" -c "import ${importName}"`, { timeout: 10000 });
            console.log(`  ✓ ${pkg}`);
          } catch {
            console.warn(`  ✗ ${pkg} 验证失败`);
          }
        }
      } catch (e) {
        console.warn(`  ✗ 核心包安装失败: ${e.message}`);
      }
    }

    // best effort 包逐个安装（失败不阻塞）
    for (const pkg of bePkgs) {
      try {
        pipInstall(venvPy, pkg);
        console.log(`  ✓ ${pkg}`);
      } catch (e) {
        console.warn(`  ⚠ ${pkg} 安装失败（best effort，不影响核心功能）`);
      }
    }
  }

  // 3. Node.js npm 批量安装
  if (nodePkgs.length > 0) {
    const coreNodePkgs = nodePkgs.filter(p => !bestEffortSet.has(p));
    const beNodePkgs = nodePkgs.filter(p => bestEffortSet.has(p));

    if (coreNodePkgs.length > 0) {
      try {
        npmInstall(sandboxDir, coreNodePkgs);
        for (const pkg of coreNodePkgs) {
          console.log(`  ✓ ${pkg}`);
        }
      } catch (e) {
        console.warn(`  ✗ npm 安装失败: ${e.message}`);
      }
    }

    for (const pkg of beNodePkgs) {
      try {
        npmInstall(sandboxDir, pkg);
        console.log(`  ✓ ${pkg}`);
      } catch (e) {
        console.warn(`  ⚠ ${pkg} 安装失败（best effort，不影响核心功能）`);
      }
    }
  }

  // 4. rdkit（best effort：尝试 pip install rdkit-pypi）
  try {
    pipInstall(venvPy, 'rdkit-pypi');
    exec(`"${venvPy}" -c "import rdkit"`, { timeout: 10000 });
    console.log(`  ✓ rdkit`);
  } catch {
    console.warn(`  ⚠ rdkit 安装失败（best effort，不影响核心功能）`);
  }

  // 5. d2（best effort：下载预编译二进制）
  try {
    await installD2(path.join(sandboxDir, 'bin'));
  } catch {
    console.warn(`  ⚠ d2 安装失败（best effort，不影响核心功能）`);
  }

  // 6. graphviz（best effort：下载预编译二进制）
  try {
    await installGraphviz(path.join(sandboxDir, 'bin'));
  } catch {
    console.warn(`  ⚠ graphviz 安装失败（best effort，不影响核心功能）`);
  }

  return venvPy;
}

// ============================================================================
// 按需安装单个依赖
// ============================================================================

function installDependency(name, opts = {}) {
  const sandboxDir = getSandboxDir();
  const tierNum = DEP_TO_TIER[name];
  if (tierNum === undefined) {
    throw new Error(`未知依赖: ${name}`);
  }

  const tier = TIER_DEFINITIONS[tierNum];

  // Tier 0 已在 setupSandbox 安装
  if (tierNum === 0) {
    if (!isSandboxReady()) {
      throw new Error('沙盒未初始化，请先调用 setupSandbox()');
    }
    const venvPy = getSandboxPython();
    pipInstall(venvPy, name, opts);
    return { name, tier: 0, installed: true };
  }

  // Tier 1: Python 包
  if (tierNum === 1) {
    if (!isSandboxReady()) {
      throw new Error('沙盒未初始化，请先调用 setupSandbox()');
    }
    const venvPy = getSandboxPython();
    pipInstall(venvPy, name, opts);
    return { name, tier: 1, installed: true };
  }

  // Tier 2: Node.js 包
  if (tierNum === 2) {
    npmInstall(sandboxDir, name, opts);
    return { name, tier: 2, installed: true };
  }

  // Tier 3: CLI 工具
  if (tierNum === 3) {
    const npmPkg = tier.npmPackages?.[name];
    if (npmPkg) {
      npmInstall(sandboxDir, npmPkg, opts);
      return { name, tier: 3, installed: true, source: 'npm' };
    }
    // 无法自动安装的 CLI 工具
    return { name, tier: 3, installed: false, error: '该 CLI 工具需手动安装' };
  }
}

// ============================================================================
// 完整沙盒初始化
// ============================================================================

async function setupSandbox(options = {}) {
  const { autoInstall = true, verbose = true } = options;

  // 1. 检查系统 Python
  const systemPython = findSystemPython();
  if (!systemPython) {
    throw new Error(
      '未找到系统 Python 3.8+。沙盒需要系统 Python 来创建 venv。\n' +
      '请安装 Python 3.8+ 或设置 TDK_PYTHON 环境变量。'
    );
  }
  const pyCheck = validatePython(systemPython);
  if (!pyCheck.ok) {
    throw new Error(pyCheck.error);
  }

  // 2. 检查沙盒是否已就绪
  if (isSandboxReady()) {
    if (verbose) console.log('[sandbox] 沙盒已就绪');
    return { ready: true, python: getSandboxPython(), state: readState() };
  }

  // 3. 创建沙盒
  ensureSandboxDir();
  const sandboxDir = getSandboxDir();

  // 4. 安装所有 autoInstall 依赖
  if (autoInstall) {
    await installAutoTiers(sandboxDir, systemPython);
  }

  // 5. 写入状态
  const state = {
    ready: true,
    createdAt: new Date().toISOString(),
    python: pyCheck.version,
    tiers: {
      0: { installed: true },
      1: { installed: true },
      2: { installed: true },
      3: { installed: true },
    },
  };
  writeState(state);

  if (verbose) console.log(`[sandbox] 沙盒初始化完成: ${sandboxDir}`);
  return { ready: true, python: getSandboxPython(), state };
}

// ============================================================================
// 依赖清单组装
// ============================================================================

function buildDependencyList() {
  const sandboxPy = getSandboxPython();
  const tiers = [];

  for (const [tierNum, tier] of Object.entries(TIER_DEFINITIONS)) {
    const deps = [];
    for (const pkg of tier.packages) {
      let installed = false;
      let source = 'none';

      if (tier.type === 'python') {
        const importName = pkg === 'pymupdf' ? 'fitz' : pkg;
        // 先查沙盒
        if (sandboxPy) {
          try {
            execSync(`"${sandboxPy}" -c "import ${importName}"`, { stdio: 'pipe', timeout: 5000 });
            installed = true;
            source = 'sandbox';
          } catch { /* ignore */ }
        }
        // 再查系统
        if (!installed) {
          const sysPy = findSystemPython();
          if (sysPy) {
            try {
              execSync(`"${sysPy}" -c "import ${importName}"`, { stdio: 'pipe', timeout: 5000 });
              installed = true;
              source = 'system';
            } catch { /* ignore */ }
          }
        }
      } else if (tier.type === 'node') {
        // 查沙盒 node_modules
        const localPath = path.join(getSandboxDir(), 'node_modules', pkg);
        if (fs.existsSync(localPath)) {
          installed = true;
          source = 'sandbox';
        } else {
          // 查全局
          try {
            require.resolve(pkg);
            installed = true;
            source = 'system';
          } catch { /* ignore */ }
        }
      } else if (tier.type === 'cli') {
        const { findInSandbox } = require('./sandbox');
        // CLI 工具名 -> 可执行文件名映射
        const exeName = pkg === 'mermaid-cli' ? 'mmdc' : pkg === 'graphviz' ? 'dot' : pkg;
        const sandboxPath = findInSandbox(exeName);
        if (sandboxPath) {
          installed = true;
          source = 'sandbox';
        } else {
          try {
            execSync(process.platform === 'win32' ? `where ${exeName} 2>nul` : `which ${exeName} 2>/dev/null`, { stdio: 'pipe', timeout: 3000 });
            installed = true;
            source = 'system';
          } catch { /* ignore */ }
        }
      }

      deps.push({ name: pkg, installed, type: tier.type, source });
    }

    tiers.push({
      tier: parseInt(tierNum, 10),
      name: tier.name,
      description: tier.description,
      autoInstall: tier.autoInstall,
      deps,
    });
  }

  const allDeps = tiers.flatMap(t => t.deps);
  const installed = allDeps.filter(d => d.installed).length;
  const missing = allDeps.filter(d => !d.installed).length;

  return {
    summary: {
      total: allDeps.length,
      installed,
      missing,
      sandboxReady: isSandboxReady(),
    },
    tiers,
  };
}

module.exports = {
  TIER_DEFINITIONS,
  DEP_TO_TIER,
  setupSandbox,
  installDependency,
  installAutoTiers,
  buildDependencyList,
  createVenv,
  pipInstall,
  npmInstall,
};
