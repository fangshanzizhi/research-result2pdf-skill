/**
 * 化学领域接口
 */
const { render } = require('../core/engine');

class Chemistry {
  /**
   * 绘制分子结构图
   * @param {string} smiles - SMILES 字符串，如 'CCO'（乙醇）
   * @param {object} options
   * @param {string} options.format - 'png' | 'svg'
   * @param {number} options.width - 图片宽度（像素）
   * @param {number} options.height - 图片高度（像素）
   * @param {string} options.outputPath - 输出路径
   */
  async molecule(smiles, options = {}) {
    return render({
      domain: 'chemistry',
      type: 'molecule',
      input: { smiles, width: options.width || 400, height: options.height || 400, style: options.style || '2d' },
      format: options.format || 'png',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 绘制化学反应方程式
   * @param {string} latex - LaTeX 格式的反应方程式
   * @param {object} options
   */
  async reaction(latex, options = {}) {
    return render({
      domain: 'chemistry',
      type: 'equation',
      input: { latex, fontSize: options.fontSize || 16 },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Chemistry();
