/**
 * 数学领域接口
 */
const { render } = require('../core/engine');

class Math {
  /**
   * 绘制数学公式
   * @param {string} latex - LaTeX 公式
   * @param {object} options
   */
  async formula(latex, options = {}) {
    return render({
      domain: 'math',
      type: 'formula',
      input: { latex, fontSize: options.fontSize || 18 },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 绘制几何图
   * @param {object[]} shapes - 几何形状数组
   * @param {object} options
   */
  async geometry(shapes, options = {}) {
    return render({
      domain: 'math',
      type: 'geometry',
      input: {
        shapes: shapes || [],
        xlim: options.xlim || [-5, 5],
        ylim: options.ylim || [-5, 5],
        title: options.title || 'Geometry',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 绘制函数图像
   * @param {object[]} functions - 函数数组，每个元素含 expr/label/color
   * @param {object} options
   */
  async functionPlot(functions, options = {}) {
    return render({
      domain: 'math',
      type: 'function',
      input: {
        functions: functions || [{ expr: 'np.sin(x)', label: 'sin(x)', color: 'blue' }],
        xmin: options.xmin || -10,
        xmax: options.xmax || 10,
        title: options.title || 'Function Plot',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Math();
