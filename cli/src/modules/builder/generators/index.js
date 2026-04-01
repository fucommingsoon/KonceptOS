/**
 * Multi-file Generator - 多文件生成器
 * 基于 coding_groups 生成多文件项目结构
 */
import { compute } from '../../../core/fca.js';
import { computeCodingGroups, computeExecutionOrder } from '../../../core/koncept.js';
import { generateChannels } from './channels.js';
import { generateContracts } from './contracts.js';
import { generateStore } from './store.js';
import { generateModules } from './modules.js';
import { generateTests } from './tests.js';
import { generateHTML } from './html.js';
import { generateCSS } from './css.js';
import { generatePackage } from './package.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

// 多文件项目结构
export function generateProject(state, options = {}) {
  const {
    projectName = 'konceptos-app',
    testFramework = 'vitest',
    withTests = true
  } = options;

  const result = compute(state.objects, state.attributes, state.incidence);
  const groups = computeCodingGroups(state, result.concepts);
  const order = computeExecutionOrder(state);

  const files = {};

  // 1. package.json
  files['package.json'] = generatePackage(projectName, {
    testFramework,
    withTests
  });

  // 2. index.html
  files['index.html'] = generateHTML(projectName);

  // 3. CSS
  files['src/css/style.css'] = generateCSS();

  // 4. Channel 类型定义
  files['src/js/channels.js'] = generateChannels(state);

  // 5. Contracts（模块接口）
  files['src/js/contracts.js'] = generateContracts(state);

  // 6. ChannelStore
  files['src/js/store.js'] = generateStore(state);

  // 7. 各模块实现
  const moduleFiles = generateModules(state, groups, order);
  Object.assign(files, moduleFiles);

  // 8. 主循环
  files['src/js/main.js'] = generateMain(order, state.objects);

  // 9. 测试文件
  if (withTests) {
    const testFiles = generateTests(state, groups, testFramework);
    Object.assign(files, testFiles);
  }

  // 10. 配置文件
  files[`vitest.config.js`] = testFramework === 'vitest' ? generateVitestConfig() : '';
  files[`jest.config.js`] = testFramework === 'jest' ? generateJestConfig() : '';

  return { files, groups, order };
}

// 生成 spec（用于 LLM 调用）
export function generateSpec(state) {
  const result = compute(state.objects, state.attributes, state.incidence);
  const conv = getAllConventions(state);

  const lines = [];
  lines.push('# FCA Spec\n');

  if (conv) {
    lines.push(`## Conventions\n\`\`\`\n${conv}\n\`\`\`\n`);
  }

  lines.push(`## Objects (${Object.keys(state.objects).length})\n`);
  lines.push('| ID | Name | Desc |\n|----|------|------|');
  for (const [o, ob] of Object.entries(state.objects)) {
    lines.push(`| ${o} | ${ob.name} | ${ob.desc || ''} |`);
  }

  lines.push(`\n## Attributes (${Object.keys(state.attributes).length})\n`);
  lines.push('| ID | Name | Schema | Binding |\n|----|------|--------|---------|');
  for (const [a, at] of Object.entries(state.attributes)) {
    const schema = state.schemas?.[a] || '-';
    const binding = state.bindings?.[a] || '-';
    lines.push(`| ${a} | ${at.name} | ${schema} | ${binding} |`);
  }

  const aids = Object.keys(state.attributes).sort();
  lines.push(`\n## Incidence\n`);
  lines.push(`| |${aids.map(a => state.attributes[a].name.substring(0, 8)).join('|')}|\n`);
  lines.push(`|--${'|--'.repeat(aids.length)}|`);
  for (const o of Object.keys(state.objects).sort()) {
    const row = `| ${state.objects[o].name.substring(0, 12)} `;
    lines.push(row + aids.map(a => ` ${state.incidence[`${o}|${a}`] || '?'}`).join(' ') + ' |');
  }

  lines.push(`\n## Concepts (${result.concepts.length})\n`);
  lines.push(`Coding groups: ${Object.keys(computeCodingGroups(state, result.concepts)).length}`);

  return lines.join('\n');
}

function getAllConventions(state) {
  const parts = [];
  if (state.seed?.conventions?.length) {
    parts.push(state.seed.conventions.map(c => `- ${c}`).join('\n'));
  }
  if (state.conventions) parts.push(state.conventions);
  return parts.join('\n');
}
