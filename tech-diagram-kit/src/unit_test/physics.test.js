/**
 * physics domain 单元测试
 * 验证 circuit() 接口调用参数正确性
 */

jest.mock('../core/engine', () => ({
  render: jest.fn(),
}));

const physics = require('../domains/physics');
const { render } = require('../core/engine');

describe('Physics Domain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render.mockResolvedValue({ success: true, path: '/tmp/test.svg', size: 1024 });
  });

  test('circuit() 默认使用 basic 类型', async () => {
    await physics.circuit({});
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'physics',
      type: 'circuit',
      input: { circuitType: 'basic', elements: undefined },
      format: 'svg',
    }));
  });

  test('circuit() basic 类型', async () => {
    await physics.circuit({ circuitType: 'basic' });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      input: { circuitType: 'basic', elements: undefined },
    }));
  });

  test('circuit() opamp 类型', async () => {
    await physics.circuit({ circuitType: 'opamp' });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      input: { circuitType: 'opamp', elements: undefined },
    }));
  });

  test('circuit() logic 类型', async () => {
    await physics.circuit({ circuitType: 'logic' });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      input: { circuitType: 'logic', elements: undefined },
    }));
  });

  test('circuit() custom 类型含元件列表', async () => {
    const elements = [{ type: 'Resistor', label: 'R1' }, { type: 'Capacitor', label: 'C1' }];
    await physics.circuit({ circuitType: 'custom', elements });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      input: { circuitType: 'custom', elements },
    }));
  });

  test('circuit() 支持自定义 format 和 dpi', async () => {
    await physics.circuit({ circuitType: 'basic' }, { format: 'png', dpi: 300 });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      format: 'png',
      dpi: 300,
    }));
  });

  test('formula() 调用参数正确', async () => {
    await physics.formula('E = mc^2');
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'physics',
      type: 'formula',
      input: expect.objectContaining({ latex: 'E = mc^2' }),
    }));
  });

  test('bandDiagram() 调用参数正确', async () => {
    await physics.bandDiagram({ conductionBand: [1, 2], valenceBand: [0, 1], fermiLevel: 0.5 });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'physics',
      type: 'banddiagram',
    }));
  });

  test('field() 调用参数正确', async () => {
    await physics.field({ Ux: [1, 2], Vy: [3, 4] });
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'physics',
      type: 'field',
    }));
  });
});
