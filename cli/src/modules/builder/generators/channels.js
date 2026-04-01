/**
 * Channel Types Generator - 生成通道类型定义
 */
export function generateChannels(state) {
  const lines = [
    '/**',
    ' * Channel Types - 通道类型定义',
    ' * 自动生成自 KonceptOS schemas',
    ' */',
    ''
  ];

  for (const [aid, attr] of Object.entries(state.attributes)) {
    const schema = state.schemas?.[aid];
    const name = attr.name;

    lines.push(`// Channel: ${name} (${aid})`);

    if (schema) {
      // 尝试解析 schema 并生成 TypeScript 类型
      lines.push(`export const ${name}Schema = ${schema};`);
      lines.push(`export const ${name} = ${schema};`);
    } else {
      // 默认类型
      lines.push(`export const ${name}Schema = { type: 'object' };`);
      lines.push(`export const ${name} = {};`);
    }
    lines.push('');
  }

  // 批量导出
  const channelNames = Object.values(state.attributes).map(a => a.name);
  lines.push(`export const CHANNELS = ${JSON.stringify(channelNames, null, 2)};`);
  lines.push('');

  return lines.join('\n');
}
