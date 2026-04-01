/**
 * ChannelStore Generator - 生成状态存储
 */
export function generateStore(state) {
  const channelNames = Object.values(state.attributes).map(a => a.name);

  const lines = [
    '/**',
    ' * ChannelStore - 通道状态存储',
    ' * 自动生成',
    ' */',
    '',
    '// 通道状态',
    'const state = {};',
    '',
    '// 初始化所有通道',
    'function initStore() {',
  ];

  for (const name of channelNames) {
    lines.push(`  state['${name}'] = {};`);
  }

  lines.push('}');
  lines.push('');

  // read 函数
  lines.push('/**');
  lines.push(' * 读取通道（带契约验证）');
  lines.push(' */');
  lines.push('export function read(channel, moduleName = null) {');
  lines.push('  if (!state[channel]) {');
  lines.push(`    state[channel] = {};`);
  lines.push('  }');
  lines.push('  ');
  lines.push('  // TODO: 开发模式下验证契约');
  lines.push('  return state[channel];');
  lines.push('}');
  lines.push('');

  // write 函数
  lines.push('/**');
  lines.push(' * 写入通道（带契约验证）');
  lines.push(' */');
  lines.push('export function write(channel, data, moduleName = null) {');
  lines.push('  if (!state[channel]) {');
  lines.push(`    state[channel] = {};`);
  lines.push('  }');
  lines.push('  ');
  lines.push('  // TODO: 开发模式下验证契约');
  lines.push('  Object.assign(state[channel], data);');
  lines.push('}');
  lines.push('');

  // batch 函数
  lines.push('/**');
  lines.push(' * 批量读取多个通道');
  lines.push(' */');
  lines.push('export function readMany(channels) {');
  lines.push('  const result = {};');
  lines.push('  for (const channel of channels) {');
  lines.push('    result[channel] = read(channel);');
  lines.push('  }');
  lines.push('  return result;');
  lines.push('}');
  lines.push('');

  // snapshot 函数
  lines.push('/**');
  lines.push(' * 获取状态快照');
  lines.push(' */');
  lines.push('export function snapshot() {');
  lines.push('  return JSON.parse(JSON.stringify(state));');
  lines.push('}');
  lines.push('');

  // restore 函数
  lines.push('/**');
  lines.push(' * 恢复状态');
  lines.push(' */');
  lines.push('export function restore(snap) {');
  lines.push('  Object.assign(state, snap);');
  lines.push('}');
  lines.push('');

  lines.push('// 初始化');
  lines.push('initStore();');
  lines.push('');

  return lines.join('\n');
}
