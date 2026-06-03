/**
 * TDK 引擎单元测试
 * 覆盖 REGISTRY 新增项、render 路由、listSupported
 */

const { listSupported, listDomains, REGISTRY, render } = require('../core/engine');

describe('TDK Engine', () => {
  describe('REGISTRY', () => {
    test('physics.circuit 已注册', () => {
      expect(REGISTRY['physics.circuit']).toBeDefined();
      expect(REGISTRY['physics.circuit'].renderer).toBe('schemdraw');
      expect(REGISTRY['physics.circuit'].fallback).toBeNull();
      expect(REGISTRY['physics.circuit'].formats).toContain('svg');
    });

    test('全部 9 个领域均有注册类型', () => {
      const domains = new Set();
      for (const key of Object.keys(REGISTRY)) {
        domains.add(key.split('.')[0]);
      }
      expect(domains.size).toBeGreaterThanOrEqual(9);
      expect(domains).toContain('cs');
      expect(domains).toContain('math');
      expect(domains).toContain('physics');
      expect(domains).toContain('ai');
      expect(domains).toContain('chip');
      expect(domains).toContain('network');
      expect(domains).toContain('manufacturing');
      expect(domains).toContain('chemistry');
      expect(domains).toContain('general');
    });

    test('physics 领域包含 formula/banddiagram/field/circuit', () => {
      expect(REGISTRY['physics.formula']).toBeDefined();
      expect(REGISTRY['physics.banddiagram']).toBeDefined();
      expect(REGISTRY['physics.field']).toBeDefined();
      expect(REGISTRY['physics.circuit']).toBeDefined();
    });

    test('cs 领域包含 uml/architecture/er/statemachine/flowchart/gantt', () => {
      expect(REGISTRY['cs.uml']).toBeDefined();
      expect(REGISTRY['cs.architecture']).toBeDefined();
      expect(REGISTRY['cs.er']).toBeDefined();
      expect(REGISTRY['cs.statemachine']).toBeDefined();
      expect(REGISTRY['cs.flowchart']).toBeDefined();
      expect(REGISTRY['cs.gantt']).toBeDefined();
    });
  });

  describe('listSupported', () => {
    test('返回对象包含新增领域', () => {
      const supported = listSupported();
      expect(supported.physics).toBeDefined();
      expect(supported.network).toBeDefined();
      expect(supported.manufacturing).toBeDefined();
      expect(supported.chemistry).toBeDefined();
    });

    test('physics 领域列出 4 种类型', () => {
      const supported = listSupported();
      const physicsTypes = supported.physics.map(t => t.type);
      expect(physicsTypes).toContain('formula');
      expect(physicsTypes).toContain('banddiagram');
      expect(physicsTypes).toContain('field');
      expect(physicsTypes).toContain('circuit');
    });
  });

  describe('listDomains', () => {
    test('返回 9 个领域', () => {
      const domains = listDomains();
      expect(domains).toContain('physics');
      expect(domains).toContain('network');
      expect(domains).toContain('manufacturing');
      expect(domains).toContain('chemistry');
    });
  });

  describe('render', () => {
    test('不支持的类型应抛出错误', async () => {
      await expect(render({ domain: 'invalid', type: 'unknown' }))
        .rejects.toThrow(/不支持的图表类型/);
    });

    test('不支持的格式应抛出错误', async () => {
      await expect(render({ domain: 'physics', type: 'circuit', format: 'mp4' }))
        .rejects.toThrow(/不支持格式/);
    });
  });
});
