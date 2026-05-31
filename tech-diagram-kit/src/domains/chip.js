/**
 * 芯片领域接口
 */
const { render } = require('../core/engine');

class Chip {
  /**
   * 芯片架构框图
   * @param {object} data
   * @param {object} options
   */
  async architecture(data, options = {}) {
    const dsl = data.dsl || data.code || `direction: right
CPU: {
  shape: rectangle
  style.fill: "#E8F0FE"
}
GPU: {
  shape: rectangle
  style.fill: "#E8F0FE"
}
NPU: {
  shape: rectangle
  style.fill: "#FCE8E6"
}
Memory: {
  shape: cylinder
  style.fill: "#E6F4EA"
}
Interconnect: {
  shape: diamond
  style.fill: "#FFF4E5"
}
CPU -> Interconnect
GPU -> Interconnect
NPU -> Interconnect
Interconnect -> Memory`;
    return render({
      domain: 'chip',
      type: 'architecture',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 时序图
   * @param {object[]} signals - 信号数组，每个含 name 和 wave
   * @param {object} options
   */
  async timing(signals, options = {}) {
    return render({
      domain: 'chip',
      type: 'timing',
      input: {
        signals: signals || [
          { name: 'CLK', wave: [0,0,1,1,0,0,1,1] },
          { name: 'DATA', wave: [0,0,0,1,1,1,0,0] },
        ],
        title: options.title || 'Timing Diagram',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * NoC 拓扑图
   * @param {number} meshSize - Mesh 网格尺寸，如 3
   * @param {object} options
   */
  async noc(meshSize, options = {}) {
    return render({
      domain: 'chip',
      type: 'noc',
      input: {
        meshSize: meshSize || 3,
        title: options.title || `${meshSize || 3}x${meshSize || 3} Mesh NoC`,
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 电路图
   * @param {object} data
   * @param {object} options
   */
  async circuit(data, options = {}) {
    return render({
      domain: 'chip',
      type: 'circuit',
      input: {
        circuitType: data.circuitType || 'basic',
        elements: data.elements,
      },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Chip();
