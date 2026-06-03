/**
 * index.js 单元测试
 * 使用 jest.mock 隔离 compat 与 TDK 依赖
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// mock compat 模块
jest.mock('../../compat', () => ({
  getPython: jest.fn(() => '/usr/bin/python3'),
  runPython: jest.fn(),
  checkPythonEnv: jest.fn(() => ({
    ok: true,
    python: '/usr/bin/python3',
    version: '3.11',
    packages: { reportlab: true, pymupdf: true },
    missing: [],
  })),
  pyPath: jest.fn((p) => p.replace(/\\/g, '/')),
}));

// mock tech-diagram-kit
jest.mock('../../tech-diagram-kit/src/index.js', () => ({
  render: jest.fn(),
}));

// mock fs 的部分方法
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(actual.existsSync),
    mkdirSync: jest.fn(actual.mkdirSync),
    writeFileSync: jest.fn(actual.writeFileSync),
    statSync: jest.fn(actual.statSync),
    mkdtempSync: jest.fn((prefix) => actual.mkdtempSync(prefix)),
    rmSync: jest.fn(),
  };
});

const { generatePdf, init } = require('../../index');
const compat = require('../../compat');
const tdk = require('../../tech-diagram-kit/src/index.js');

describe('index.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    compat.checkPythonEnv.mockReturnValue({
      ok: true,
      python: '/usr/bin/python3',
      version: '3.11',
      packages: { reportlab: true, pymupdf: true },
      missing: [],
    });
    compat.runPython.mockImplementation(async (py, args) => {
      if (args.length >= 3 && args[2] && args[2].endsWith('.pdf')) {
        fs.writeFileSync(args[2], '%PDF-1.4 fake');
      }
      return { stdout: '', stderr: '', code: 0 };
    });
    tdk.render.mockResolvedValue({ success: true, path: '/tmp/fake.png', size: 1234 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =====================================================================
  // init
  // =====================================================================
  describe('init', () => {
    test('I-002: 创建输出目录', () => {
      const result = init();
      expect(result.pdfDir).toBe(path.resolve(process.cwd(), 'pdf'));
      expect(result.templatesDir).toBe(path.resolve(__dirname, '../../templates'));
      expect(fs.existsSync(result.pdfDir)).toBe(true);
    });

    test('I-003: 目录已存在不报错', () => {
      init();
      const result = init();
      expect(result.pdfDir).toBeTruthy();
    });
  });

  // =====================================================================
  // generatePdf - 参数校验
  // =====================================================================
  describe('generatePdf - 参数校验', () => {
    test('I-016: 缺少 context 应抛出错误', async () => {
      await expect(generatePdf({ struct: [] })).rejects.toThrow(/Missing required fields/);
    });

    test('I-017: 缺少 struct 应抛出错误', async () => {
      await expect(generatePdf({ context: 'x' })).rejects.toThrow(/Missing required fields/);
    });

    test('I-018: 环境未就绪应抛出错误', async () => {
      compat.checkPythonEnv.mockReturnValueOnce({
        ok: false,
        error: '缺少依赖',
      });
      await expect(generatePdf({ context: 'x', struct: [] })).rejects.toThrow(/缺少依赖/);
    });
  });

  // =====================================================================
  // generatePdf - 默认路径
  // =====================================================================
  describe('generatePdf - 默认路径', () => {
    test('I-025: 默认输出路径生成', async () => {
      const originalCwd = process.cwd();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-test-'));
      process.chdir(tmpDir);

      const result = await generatePdf({
        context: '默认路径测试',
        struct: [{ type: 'heading', text: 'Test', level: 1 }],
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);

      process.chdir(originalCwd);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  });

  // =====================================================================
  // generatePdf - 图表渲染
  // =====================================================================
  describe('generatePdf - 图表渲染与容错', () => {
    test('I-020: 含图表渲染', async () => {
      tdk.render.mockResolvedValue({ success: true, path: '/tmp/chart.png', size: 5678 });

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-chart-'));
      const pdfOut = path.join(tmpDir, 'out.pdf');

      const result = await generatePdf({
        context: '图表测试',
        struct: [
          { type: 'diagram', ref: 'fig1', layout: 'fullwidth', caption: '图1' },
        ],
        desc: [
          { id: 'fig1', domain: 'general', chartType: 'chart', input: { chartType: 'bar', labels: ['A'], values: [1] } },
        ],
        outputPath: pdfOut,
      });

      expect(tdk.render).toHaveBeenCalledTimes(1);
      expect(result.images).toBe(1);

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    test('I-021: diagram 缺少 id 应跳过', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-skip-'));
      const pdfOut = path.join(tmpDir, 'out.pdf');

      await generatePdf({
        context: '跳过测试',
        struct: [],
        desc: [{ domain: 'general', chartType: 'chart', input: {} }], // 无 id
        outputPath: pdfOut,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping diagram without id'));

      consoleSpy.mockRestore();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    test('I-022: 图表渲染失败应继续', async () => {
      tdk.render.mockRejectedValue(new Error('TDK failed'));

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-fail-'));
      const pdfOut = path.join(tmpDir, 'out.pdf');

      const result = await generatePdf({
        context: '容错测试',
        struct: [{ type: 'diagram', ref: 'bad', layout: 'fullwidth', caption: '坏图' }],
        desc: [{ id: 'bad', domain: 'general', chartType: 'chart', input: {} }],
        outputPath: pdfOut,
      });

      expect(result.success).toBe(true);
      expect(result.images).toBe(0);

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    test('I-023: 图表 ref 未找到应替换为占位文本', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-ref-'));
      const pdfOut = path.join(tmpDir, 'out.pdf');

      await generatePdf({
        context: 'ref 未找到测试',
        struct: [{ type: 'diagram', ref: 'missing', layout: 'fullwidth', caption: '缺失' }],
        desc: [], // desc 为空，所以 ref 找不到
        outputPath: pdfOut,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Diagram ref not found'));

      consoleSpy.mockRestore();
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  });

  // =====================================================================
  // generatePdf - 输出路径
  // =====================================================================
  describe('generatePdf - 输出路径处理', () => {
    test('I-024: 自定义 outputPath', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-custom-'));
      const customPath = path.join(tmpDir, 'custom', 'nested', 'report.pdf');

      const result = await generatePdf({
        context: '自定义路径测试',
        struct: [],
        outputPath: customPath,
      });

      expect(result.path).toBe(customPath);
      expect(fs.existsSync(customPath)).toBe(true);

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    test('I-026: 输出路径冲突自动递增', async () => {
      const originalCwd = process.cwd();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-unique-'));
      process.chdir(tmpDir);

      // 预先创建 pdf 目录和冲突文件
      fs.mkdirSync('pdf', { recursive: true });
      fs.writeFileSync(path.join('pdf', '冲突测试.pdf'), '%PDF-1.4');
      fs.writeFileSync(path.join('pdf', '冲突测试_1.pdf'), '%PDF-1.4');

      const result = await generatePdf({
        context: '冲突测试',
        struct: [{ type: 'heading', text: 'Test', level: 1 }],
      });

      expect(path.basename(result.path)).toBe('冲突测试_2.pdf');

      process.chdir(originalCwd);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  });

  // =====================================================================
  // generatePdf - Python 组装器失败
  // =====================================================================
  describe('generatePdf - 异常场景', () => {
    test('I-028: Python assembler 失败应抛出', async () => {
      compat.runPython.mockRejectedValue(new Error('Python crashed'));

      await expect(
        generatePdf({ context: '异常测试', struct: [] })
      ).rejects.toThrow(/Python crashed/);
    });

    test('I-029: PDF 文件未生成应抛出', async () => {
      compat.runPython.mockImplementation(async () => ({ stdout: '', stderr: '', code: 0 }));

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-nogen-'));
      const pdfOut = path.join(tmpDir, 'not_created.pdf');
      if (fs.existsSync(pdfOut)) fs.unlinkSync(pdfOut);

      await expect(
        generatePdf({ context: '未生成测试', struct: [], outputPath: pdfOut })
      ).rejects.toThrow(/PDF file was not generated/);

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  });
});
