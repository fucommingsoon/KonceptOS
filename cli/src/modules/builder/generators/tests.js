/**
 * Tests Generator - 生成测试文件
 */
export function generateTests(state, groups, testFramework = 'vitest') {
  const files = {};

  // 通道测试
  files['tests/channels.test.js'] = generateChannelTests(state, testFramework);

  // Store 测试
  files['tests/store.test.js'] = generateStoreTests(state, testFramework);

  // 契约测试
  files['tests/contracts.test.js'] = generateContractsTests(state, testFramework);

  // 各模块测试
  for (const [oid, obj] of Object.entries(state.objects)) {
    const fileName = `tests/modules/${toFileName(obj.name)}.test.js`;
    files[fileName] = generateModuleTest(obj, testFramework);
  }

  return files;
}

function generateChannelTests(state, testFramework) {
  const channelNames = Object.values(state.attributes).map(a => a.name);

  if (testFramework === 'vitest') {
    return generateVitestChannelTests(state, channelNames);
  } else {
    return generateJestChannelTests(state, channelNames);
  }
}

function generateVitestChannelTests(state, channelNames) {
  const lines = [
    '/**',
    ' * Channel Tests - 通道测试',
    ' */',
    '',
    "import { describe, it, expect, beforeEach } from 'vitest';",
    "import * as channels from '../src/js/channels.js';",
    '',
    'describe("Channels", () => {',
  ];

  for (const name of channelNames) {
    lines.push(`  it('${name} channel exists', () => {`);
    lines.push(`    expect(channels.${name}).toBeDefined();`);
    lines.push('  });');
  }

  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

function generateJestChannelTests(state, channelNames) {
  const lines = [
    '/**',
    ' * Channel Tests - 通道测试',
    ' */',
    '',
    "const channels = require('../src/js/channels.js');",
    '',
    'describe("Channels", () => {',
  ];

  for (const name of channelNames) {
    lines.push(`  test('${name} channel exists', () => {`);
    lines.push(`    expect(channels.${name}).toBeDefined();`);
    lines.push('  });');
  }

  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

function generateStoreTests(state, testFramework) {
  if (testFramework === 'vitest') {
    return [
      '/**',
      ' * Store Tests - 状态存储测试',
      ' */',
      '',
      "import { describe, it, expect, beforeEach } from 'vitest';",
      "import { read, write, snapshot, restore } from '../src/js/store.js';",
      '',
      'describe("Store", () => {',
      '  beforeEach(() => {',
      '    // 重置 store',
      '    restore({});',
      '  });',
      '',
      '  it("can write and read a channel", () => {',
      '    write("test_channel", { value: 42 });',
      '    expect(read("test_channel").value).toBe(42);',
      '  });',
      '',
      '  it("can snapshot and restore", () => {',
      '    write("test_channel", { value: 42 });',
      '    const snap = snapshot();',
      '    write("test_channel", { value: 100 });',
      '    restore(snap);',
      '    expect(read("test_channel").value).toBe(42);',
      '  });',
      '});',
      ''
    ].join('\n');
  } else {
    return [
      '/**',
      ' * Store Tests - 状态存储测试',
      ' */',
      '',
      "const { read, write, snapshot, restore } = require('../src/js/store.js');",
      '',
      'describe("Store", () => {',
      '  beforeEach(() => {',
      '    restore({});',
      '  });',
      '',
      '  test("can write and read a channel", () => {',
      '    write("test_channel", { value: 42 });',
      '    expect(read("test_channel").value).toBe(42);',
      '  });',
      '',
      '  test("can snapshot and restore", () => {',
      '    write("test_channel", { value: 42 });',
      '    const snap = snapshot();',
      '    write("test_channel", { value: 100 });',
      '    restore(snap);',
      '    expect(read("test_channel").value).toBe(42);',
      '  });',
      '});',
      ''
    ].join('\n');
  }
}

function generateContractsTests(state, testFramework) {
  if (testFramework === 'vitest') {
    return [
      '/**',
      ' * Contracts Tests - 契约测试',
      ' */',
      '',
      "import { describe, it, expect } from 'vitest';",
      "import { CONTRACTS, validateContract } from '../src/js/contracts.js';",
      '',
      'describe("Contracts", () => {',
      '  it("CONTRACTS is defined", () => {',
      '    expect(CONTRACTS).toBeDefined();',
      '  });',
      '',
      '  it("validateContract works", () => {',
      '    const moduleName = Object.keys(CONTRACTS)[0];',
      '    if (moduleName) {',
      '      const channel = CONTRACTS[moduleName].reads[0] || CONTRACTS[moduleName].readwrites[0];',
      '      if (channel) {',
      '        expect(validateContract(moduleName, channel, "read")).toBe(true);',
      '      }',
      '    }',
      '  });',
      '});',
      ''
    ].join('\n');
  } else {
    return [
      '/**',
      ' * Contracts Tests - 契约测试',
      ' */',
      '',
      "const { CONTRACTS, validateContract } = require('../src/js/contracts.js');",
      '',
      'describe("Contracts", () => {',
      '  test("CONTRACTS is defined", () => {',
      '    expect(CONTRACTS).toBeDefined();',
      '  });',
      '});',
      ''
    ].join('\n');
  }
}

function generateModuleTest(obj, testFramework) {
  const lines = [
    '/**',
    ` * Module Test: ${obj.name}`,
    ` * ${obj.desc || '自动生成'}`,
    ' */',
    ''
  ];

  if (testFramework === 'vitest') {
    lines.push("import { describe, it, expect } from 'vitest';");
    lines.push(`import { init, update, render } from '../../src/js/modules/${toFileName(obj.name)}.js';`);
    lines.push('');
    lines.push(`describe("${obj.name}", () => {`);
    lines.push('  it("init function exists", () => {');
    lines.push('    expect(init).toBeDefined();');
    lines.push('  });');
    lines.push('');
    lines.push('  it("update function exists", () => {');
    lines.push('    expect(update).toBeDefined();');
    lines.push('  });');
    lines.push('});');
  } else {
    lines.push("const { init, update } = require('../../src/js/modules/" + toFileName(obj.name) + ".js');");
    lines.push('');
    lines.push(`describe("${obj.name}", () => {`);
    lines.push('  test("init function exists", () => {');
    lines.push('    expect(init).toBeDefined();');
    lines.push('  });');
    lines.push('});');
  }

  lines.push('');
  return lines.join('\n');
}

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
