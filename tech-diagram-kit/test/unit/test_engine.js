/**
 * Engine 单元测试
 */
const assert = require('assert');
const { render, listSupported, listDomains, REGISTRY } = require('../../src/core/engine');
const { checkAll } = require('../../src/core/dependency-check');

console.log('=== Test: Engine ===');

// Test 1: listDomains
const domains = listDomains();
assert(domains.includes('chemistry'), 'domains should include chemistry');
assert(domains.includes('physics'), 'domains should include physics');
assert(domains.includes('cs'), 'domains should include cs');
assert(domains.includes('ai'), 'domains should include ai');
assert(domains.includes('network'), 'domains should include network');
assert(domains.includes('chip'), 'domains should include chip');
assert(domains.includes('manufacturing'), 'domains should include manufacturing');
assert(domains.includes('general'), 'domains should include general');
console.log('✅ listDomains OK');

// Test 2: listSupported
const supported = listSupported();
assert(supported.chemistry.length > 0, 'chemistry should have types');
assert(supported.physics.length > 0, 'physics should have types');
console.log('✅ listSupported OK');

// Test 3: 无效 domain.type 应抛出 UNSUPPORTED_TYPE
(async () => {
  try {
    await render({ domain: 'invalid', type: 'test', input: {} });
    assert.fail('should throw for invalid type');
  } catch (e) {
    assert(e.code === 'UNSUPPORTED_TYPE', 'should throw UNSUPPORTED_TYPE');
    console.log('✅ UNSUPPORTED_TYPE error OK');
  }
})();

// Test 4: 无效 format 应抛出 UNSUPPORTED_FORMAT
(async () => {
  try {
    await render({ domain: 'math', type: 'formula', format: 'mp4', input: {} });
    assert.fail('should throw for invalid format');
  } catch (e) {
    assert(e.code === 'UNSUPPORTED_FORMAT', 'should throw UNSUPPORTED_FORMAT');
    console.log('✅ UNSUPPORTED_FORMAT error OK');
  }
})();

// Test 5: 依赖检查
const deps = checkAll();
assert(typeof deps === 'object', 'checkAll should return object');
console.log('✅ checkAll OK');

console.log('\n=== Engine tests passed ===');
