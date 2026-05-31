/**
 * 物理领域接口
 */
const { render } = require('../core/engine');

class Physics {
  /**
   * 绘制物理公式
   * @param {string} latex - LaTeX 公式，如 'E = mc^2'
   * @param {object} options
   */
  async formula(latex, options = {}) {
    return render({
      domain: 'physics',
      type: 'formula',
      input: { latex, fontSize: options.fontSize || 18 },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 绘制能带图
   * @param {object} options
   * @param {number[]} options.conductionBand - 导带能量数组
   * @param {number[]} options.valenceBand - 价带能量数组
   * @param {number} options.fermiLevel - 费米能级
   */
  async bandDiagram(options = {}) {
    return render({
      domain: 'physics',
      type: 'banddiagram',
      input: {
        conductionBand: options.conductionBand,
        valenceBand: options.valenceBand,
        fermiLevel: options.fermiLevel,
        title: options.title || 'Energy Band Diagram',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 绘制矢量场图
   * @param {object} options
   */
  async field(options = {}) {
    return render({
      domain: 'physics',
      type: 'field',
      input: {
        Ux: options.Ux,
        Vy: options.Vy,
        title: options.title || 'Vector Field',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Physics();
