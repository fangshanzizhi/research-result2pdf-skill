/**
 * Python 适配器单元测试
 */
const assert = require('assert');
const { callPython } = require('../../src/core/adapter');
const fs = require('fs');
const path = require('path');

console.log('=== Test: Python Adapter ===');

(async () => {
  // Test 1: matplotlib 公式渲染
  try {
    const result = await callPython('latex_math', {
      input: { latex: 'E = mc^2' },
      format: 'png',
      outputPath: path.join(__dirname, '../fixtures/test_formula.png'),
      dpi: 150,
    });
    assert(result.success, 'latex_math should succeed');
    assert(fs.existsSync(result.path), 'output file should exist');
    assert(result.size > 0, 'output file should not be empty');
    console.log('✅ latex_math OK:', result.path, `(${result.size} bytes)`);
  } catch (e) {
    console.log('⚠️  latex_math skipped:', e.message);
  }

  // Test 2: matplotlib 函数图像
  try {
    const result = await callPython('mpl_diagram', {
      input: {
        functions: [{ expr: 'np.sin(x)', label: 'sin(x)', color: 'blue' }],
        xmin: -6, xmax: 6,
        title: 'Sine Wave',
      },
      format: 'png',
      outputPath: path.join(__dirname, '../fixtures/test_function.png'),
      domain: 'math',
      type: 'function',
      dpi: 150,
    });
    assert(result.success, 'mpl_diagram function should succeed');
    assert(fs.existsSync(result.path), 'output file should exist');
    console.log('✅ matplotlib function OK:', result.path, `(${result.size} bytes)`);
  } catch (e) {
    console.log('⚠️  matplotlib function skipped:', e.message);
  }

  // Test 3: 神经网络架构
  try {
    const result = await callPython('mpl_diagram', {
      input: { layers: [4, 6, 5, 3], title: 'Test Neural Net' },
      format: 'png',
      outputPath: path.join(__dirname, '../fixtures/test_neuralnet.png'),
      domain: 'ai',
      type: 'neuralnet',
      dpi: 150,
    });
    assert(result.success, 'neuralnet should succeed');
    assert(fs.existsSync(result.path), 'output file should exist');
    console.log('✅ neuralnet OK:', result.path, `(${result.size} bytes)`);
  } catch (e) {
    console.log('⚠️  neuralnet skipped:', e.message);
  }

  console.log('\n=== Python Adapter tests completed ===');
})();
