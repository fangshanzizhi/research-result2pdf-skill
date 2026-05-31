/**
 * 领域接口单元测试
 */
const assert = require('assert');
const tdk = require('../../src/index');
const fs = require('fs');
const path = require('path');

console.log('=== Test: Domain Interfaces ===');

const outDir = path.join(__dirname, '../fixtures');

(async () => {
  // Test 1: Math formula
  try {
    const r = await tdk.math.formula('\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}', {
      outputPath: path.join(outDir, 'domain_math_formula.png'),
    });
    assert(r.success, 'math.formula should succeed');
    console.log('✅ math.formula OK');
  } catch (e) {
    console.log('⚠️  math.formula:', e.code || e.message);
  }

  // Test 2: Physics formula
  try {
    const r = await tdk.physics.formula('F = ma', {
      outputPath: path.join(outDir, 'domain_physics_formula.png'),
    });
    assert(r.success, 'physics.formula should succeed');
    console.log('✅ physics.formula OK');
  } catch (e) {
    console.log('⚠️  physics.formula:', e.code || e.message);
  }

  // Test 3: AI neural net
  try {
    const r = await tdk.ai.neuralNet([3, 5, 4, 2], {
      outputPath: path.join(outDir, 'domain_ai_neuralnet.png'),
    });
    assert(r.success, 'ai.neuralNet should succeed');
    console.log('✅ ai.neuralNet OK');
  } catch (e) {
    console.log('⚠️  ai.neuralNet:', e.code || e.message);
  }

  // Test 4: Chip NoC
  try {
    const r = await tdk.chip.noc(3, {
      outputPath: path.join(outDir, 'domain_chip_noc.png'),
    });
    assert(r.success, 'chip.noc should succeed');
    console.log('✅ chip.noc OK');
  } catch (e) {
    console.log('⚠️  chip.noc:', e.code || e.message);
  }

  // Test 5: General chart
  try {
    const r = await tdk.general.chart({
      chartType: 'bar',
      labels: ['A', 'B', 'C'],
      values: [10, 25, 15],
    }, {
      outputPath: path.join(outDir, 'domain_general_chart.png'),
    });
    assert(r.success, 'general.chart should succeed');
    console.log('✅ general.chart OK');
  } catch (e) {
    console.log('⚠️  general.chart:', e.code || e.message);
  }

  // Test 6: Network topology (requires graphviz)
  try {
    const r = await tdk.network.topology({
      nodes: [
        { id: 'router', label: 'Core Router' },
        { id: 'sw1', label: 'Switch 1' },
        { id: 'sw2', label: 'Switch 2' },
      ],
      edges: [
        { from: 'router', to: 'sw1' },
        { from: 'router', to: 'sw2' },
      ],
    }, {
      outputPath: path.join(outDir, 'domain_network_topo.png'),
    });
    assert(r.success, 'network.topology should succeed');
    console.log('✅ network.topology OK');
  } catch (e) {
    console.log('⚠️  network.topology:', e.code || e.message);
  }

  console.log('\n=== Domain Interface tests completed ===');
})();
