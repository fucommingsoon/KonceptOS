/**
 * Modules Generator - 生成各模块实现
 */
import { compute } from '../../../core/fca.js';
import { computeCodingGroups } from '../../../core/koncept.js';

export function generateModules(state, groups, order) {
  const files = {};
  const result = compute(state.objects, state.attributes, state.incidence);

  // 按 coding groups 分组
  const groupModules = {};
  for (const [cidx, oids] of Object.entries(groups)) {
    const groupDir = `src/js/groups/group_${cidx}`;
    groupModules[groupDir] = groupModules[groupDir] || [];
    for (const oid of oids) {
      const obj = state.objects[oid];
      if (obj) {
        groupModules[groupDir].push(obj);
      }
    }
  }

  // 生成每个模块
  const modules = Object.values(state.objects);
  for (const obj of modules) {
    const moduleName = obj.name;
    const fileName = `src/js/modules/${toFileName(moduleName)}.js`;

    // 获取该模块的契约
    const reads = [];
    const writes = [];
    const readwrites = [];

    for (const [aid, attr] of Object.entries(state.attributes)) {
      const v = state.incidence[`${obj.name}|${aid}`] || '0';
      if (v === 'R') reads.push(attr.name);
      else if (v === 'W') writes.push(attr.name);
      else if (v === 'RW') readwrites.push(attr.name);
    }

    files[fileName] = generateModuleFile(obj, reads, writes, readwrites);
  }

  // 生成模块索引
  files['src/js/modules/index.js'] = generateModulesIndex(modules);

  return files;
}

function generateModuleFile(obj, reads, writes, readwrites) {
  const lines = [
    '/**',
    ` * Module: ${obj.name}`,
    ` * ${obj.desc || '自动生成'}`,
    ' */',
    '',
    `export const MODULE_NAME = '${obj.name}';`,
    '',
    '// Contracts',
    `export const READS = [${reads.map(r => `'${r}'`).join(', ')}];`,
    `export const WRITES = [${writes.map(w => `'${w}'`).join(', ')}];`,
    `export const READWRITES = [${readwrites.map(rw => `'${rw}'`).join(', ')}];`,
    '',
    'import { read, write } from "../store.js";',
    '',
    '/**',
    ' * 初始化模块',
    ' */',
    'export function init() {',
    '  // TODO: 实现初始化逻辑',
    '  console.log(`${MODULE_NAME}: init`);',
    '}',
    '',
    '/**',
    ' * 更新模块状态',
    ' */',
    'export function update(dt) {',
    '  // TODO: 实现更新逻辑',
    '  // dt = delta time in seconds',
    '}',
    '',
    '/**',
    ' * 渲染模块',
    ' */',
    'export function render(ctx) {',
    '  // TODO: 实现渲染逻辑',
    '}',
    '',
    '/**',
    ' * 清理模块',
    ' */',
    'export function cleanup() {',
    '  // TODO: 实现清理逻辑',
    '}',
    '',
    'export default { init, update, render, cleanup };',
    ''
  ];

  return lines.join('\n');
}

function generateModulesIndex(modules) {
  const lines = [
    '/**',
    ' * Modules Index - 模块索引',
    ' * 自动生成',
    ' */',
    ''
  ];

  for (const obj of modules) {
    const importName = toFileName(obj.name);
    lines.push(`import { init as ${importName}_init, update as ${importName}_update, render as ${importName}_render } from './${importName}.js';`);
  }

  lines.push('');
  lines.push('export const MODULES = {');
  for (const obj of modules) {
    const importName = toFileName(obj.name);
    lines.push(`  ${obj.name}: {`);
    lines.push(`    init: ${importName}_init,`);
    lines.push(`    update: ${importName}_update,`);
    lines.push(`    render: ${importName}_render,`);
    lines.push(`  },`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export function initAll() {');
  lines.push('  for (const mod of Object.values(MODULES)) {');
  lines.push('    mod.init?.();');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('export function updateAll(dt) {');
  lines.push('  for (const mod of Object.values(MODULES)) {');
  lines.push('    mod.update?.(dt);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('export function renderAll(ctx) {');
  lines.push('  for (const mod of Object.values(MODULES)) {');
  lines.push('    mod.render?.(ctx);');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function toFileName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
