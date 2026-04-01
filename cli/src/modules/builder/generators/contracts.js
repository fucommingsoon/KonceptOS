/**
 * Contracts Generator - 生成模块契约
 */
export function generateContracts(state) {
  const lines = [
    '/**',
    ' * Contracts - 模块契约定义',
    ' * 自动生成自 KonceptOS I 矩阵',
    ' */',
    '',
    '// Module Contracts',
    ''
  ];

  const contracts = {};

  for (const [oid, obj] of Object.entries(state.objects)) {
    const reads = [];
    const writes = [];
    const readwrites = [];

    for (const [aid, attr] of Object.entries(state.attributes)) {
      const v = state.incidence[`${oid}|${aid}`] || '0';
      if (v === 'R') reads.push(attr.name);
      else if (v === 'W') writes.push(attr.name);
      else if (v === 'RW') readwrites.push(attr.name);
    }

    contracts[obj.name] = { reads, writes, readwrites };
  }

  lines.push('export const CONTRACTS = {');
  for (const [name, contract] of Object.entries(contracts)) {
    lines.push(`  ${name}: {`);
    lines.push(`    reads: [${contract.reads.map(r => `'${r}'`).join(', ')}],`);
    lines.push(`    writes: [${contract.writes.map(w => `'${w}'`).join(', ')}],`);
    lines.push(`    readwrites: [${contract.readwrites.map(rw => `'${rw}'`).join(', ')}]`);
    lines.push(`  },`);
  }
  lines.push('};');
  lines.push('');

  // 验证函数
  lines.push('/**');
  lines.push(' * 验证模块契约');
  lines.push(' */');
  lines.push('export function validateContract(moduleName, channel, operation) {');
  lines.push('  const contract = CONTRACTS[moduleName];');
  lines.push('  if (!contract) return false;');
  lines.push('  ');
  lines.push('  if (operation === \'read\') {');
  lines.push('    return contract.reads.includes(channel) || contract.readwrites.includes(channel);');
  lines.push('  }');
  lines.push('  if (operation === \'write\') {');
  lines.push('    return contract.writes.includes(channel) || contract.readwrites.includes(channel);');
  lines.push('  }');
  lines.push('  return false;');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
