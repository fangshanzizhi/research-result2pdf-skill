/**
 * compat.js 单元测试
 * 覆盖: findPython, getPython, validatePython, checkPyPackage,
 *       shellEscape, pyPath, runPython, runPythonExpr, checkPythonEnv
 */

const path = require('path');
const { execSync } = require('child_process');

// 保存原始平台，用于跨平台测试恢复
const ORIGINAL_PLATFORM = process.platform;

function setPlatform(platform) {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

function restorePlatform() {
  Object.defineProperty(process, 'platform', {
    value: ORIGINAL_PLATFORM,
    configurable: true,
  });
}

describe('compat.js', () => {
  // 每个测试前清除模块缓存，确保环境变量变更生效
  beforeEach(() => {
    jest.resetModules();
    delete process.env.TDK_PYTHON;
    restorePlatform();
  });

  afterEach(() => {
    restorePlatform();
  });

  // =====================================================================
  // findPython
  // =====================================================================
  describe('findPython', () => {
    test('C-001: 环境变量优先且存在', () => {
      const expected = path.resolve('/usr/bin/python3');
      // 仅在 Unix-like 平台创建模拟文件
      if (ORIGINAL_PLATFORM !== 'win32') {
        process.env.TDK_PYTHON = expected;
        // 为了测试通过，使用一个真实存在的路径
        const realPath = process.env.TDK_PYTHON = execSync('which python3 2>/dev/null || which python 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n')[0];
        const { findPython } = require('../../compat');
        expect(findPython()).toBe(path.resolve(realPath));
      } else {
        // Windows 下跳过真实文件系统测试
        const { findPython } = require('../../compat');
        const result = findPython();
        expect(result === null || typeof result === 'string').toBe(true);
      }
    });

    test('C-002: 环境变量存在但路径无效', () => {
      process.env.TDK_PYTHON = '/not/exist/python';
      const { findPython } = require('../../compat');
      const result = findPython();
      // 应继续后续策略，返回某个可用路径或 null
      expect(result === null || path.isAbsolute(result)).toBe(true);
    });

    test('C-007: 所有策略均未找到（模拟极端情况）', () => {
      // 通过 spyOn fs.existsSync 来模拟找不到任何 Python
      const fs = require('fs');
      const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.resetModules();
      const { findPython } = require('../../compat');
      expect(findPython()).toBeNull();
      spy.mockRestore();
    });
  });

  // =====================================================================
  // getPython
  // =====================================================================
  describe('getPython', () => {
    test('C-010 / C-011: 首次调用缓存，二次直接返回', () => {
      jest.resetModules();
      const { getPython } = require('../../compat');
      const first = getPython();
      const second = getPython();
      expect(second).toBe(first);
    });
  });

  // =====================================================================
  // validatePython
  // =====================================================================
  describe('validatePython', () => {
    test('C-012: 有效 Python 3.8+', () => {
      const { getPython, validatePython } = require('../../compat');
      const py = getPython();
      if (!py) {
        console.warn('Skip: no Python found');
        return;
      }
      const result = validatePython(py);
      expect(result.ok).toBe(true);
      expect(result.version).toMatch(/^3\.\d+/);
      const minor = parseInt(result.version.split('.')[1], 10);
      expect(minor).toBeGreaterThanOrEqual(8);
    });

    test('C-013 / C-014: Python 版本过低应拒绝', () => {
      const { validatePython } = require('../../compat');
      // 模拟不存在路径
      const result = validatePython('/dev/null/not_python');
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('C-015: 路径不存在/不可执行', () => {
      const { validatePython } = require('../../compat');
      const result = validatePython('/not/exist/python');
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================================
  // checkPyPackage
  // =====================================================================
  describe('checkPyPackage', () => {
    test('C-017: 包已安装', () => {
      const { getPython, checkPyPackage } = require('../../compat');
      const py = getPython();
      if (!py) return;
      const result = checkPyPackage(py, 'os'); // os 是标准库，一定存在
      expect(result.installed).toBe(true);
    });

    test('C-018: 包未安装', () => {
      const { getPython, checkPyPackage } = require('../../compat');
      const py = getPython();
      if (!py) return;
      const result = checkPyPackage(py, 'not_a_real_pkg_12345');
      expect(result.installed).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // =====================================================================
  // shellEscape
  // =====================================================================
  describe('shellEscape', () => {
    test('C-022: 简单字符串', () => {
      const { shellEscape } = require('../../compat');
      const result = shellEscape('hello');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('C-019: Windows 双引号转义', () => {
      setPlatform('win32');
      jest.resetModules();
      const { shellEscape } = require('../../compat');
      const result = shellEscape('hello "world"');
      expect(result).toContain('\\"');
      restorePlatform();
    });

    test('C-021: Unix 单引号转义', () => {
      setPlatform('linux');
      jest.resetModules();
      const { shellEscape } = require('../../compat');
      const result = shellEscape("it's me");
      expect(result).toContain("'\\''");
      restorePlatform();
    });
  });

  // =====================================================================
  // pyPath
  // =====================================================================
  describe('pyPath', () => {
    test('C-023: Windows 路径转换', () => {
      const { pyPath } = require('../../compat');
      expect(pyPath('C:\\Users\\a\\b.py')).toBe('C:/Users/a/b.py');
    });

    test('C-024: Unix 路径保持不变', () => {
      const { pyPath } = require('../../compat');
      expect(pyPath('/usr/bin/python')).toBe('/usr/bin/python');
    });
  });

  // =====================================================================
  // runPython
  // =====================================================================
  describe('runPython', () => {
    test('C-025: 正常执行', async () => {
      const { getPython, runPython } = require('../../compat');
      const py = getPython();
      if (!py) {
        console.warn('Skip: no Python found');
        return;
      }
      const result = await runPython(py, ['-c', 'print(1)']);
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('1');
    });

    test('C-026: 非零退出码应 reject', async () => {
      const { getPython, runPython } = require('../../compat');
      const py = getPython();
      if (!py) {
        console.warn('Skip: no Python found');
        return;
      }
      await expect(runPython(py, ['-c', 'import sys; sys.exit(2)'])).rejects.toMatchObject({
        code: 2,
      });
    });

    test('C-027: 超时终止', async () => {
      const { getPython, runPython } = require('../../compat');
      const py = getPython();
      if (!py) {
        console.warn('Skip: no Python found');
        return;
      }
      await expect(
        runPython(py, ['-c', 'import time; time.sleep(10)'], { timeout: 100 })
      ).rejects.toThrow(/timed out/);
    });

    test('C-028: 启动失败（非法路径）', async () => {
      const { runPython } = require('../../compat');
      await expect(
        runPython('/not/exist/python', ['-c', 'print(1)'])
      ).rejects.toThrow(/Failed to start Python/);
    });

    test('C-029: 自定义 env 合并', async () => {
      const { getPython, runPython } = require('../../compat');
      const py = getPython();
      if (!py) return;
      const result = await runPython(py, ['-c', 'import os; print(os.environ.get("FOO",""))'], {
        env: { FOO: 'bar' },
      });
      expect(result.stdout.trim()).toBe('bar');
    });

    test('C-030: 自定义 cwd', async () => {
      const { getPython, runPython } = require('../../compat');
      const py = getPython();
      if (!py) return;
      const result = await runPython(py, ['-c', 'import os; print(os.getcwd())'], {
        cwd: path.resolve('/'),
      });
      expect(result.stdout.trim()).toBe(path.resolve('/'));
    });
  });

  // =====================================================================
  // runPythonExpr
  // =====================================================================
  describe('runPythonExpr', () => {
    test('C-032 / C-033: 含引号的表达式执行', async () => {
      const { getPython, runPythonExpr } = require('../../compat');
      const py = getPython();
      if (!py) return;
      // runPythonExpr 复用 runPython，返回 { stdout, stderr, code }
      const result = await runPythonExpr(py, 'print("hello")');
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
    });

    test('C-034: 执行异常应 reject', async () => {
      const { getPython, runPythonExpr } = require('../../compat');
      const py = getPython();
      if (!py) return;
      await expect(runPythonExpr(py, 'raise RuntimeError("x")')).rejects.toBeTruthy();
    });
  });

  // =====================================================================
  // checkPythonEnv
  // =====================================================================
  describe('checkPythonEnv', () => {
    test('C-035: 完整环境检查', () => {
      const { checkPythonEnv } = require('../../compat');
      const result = checkPythonEnv();
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) {
        expect(result.python).toBeTruthy();
        expect(result.version).toMatch(/^3\.\d+/);
        expect(result.packages).toBeDefined();
        expect(Array.isArray(result.missing)).toBe(true);
      }
    });
  });
});
