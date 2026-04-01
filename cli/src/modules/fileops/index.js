/**
 * FileOps 模块 - 文件操作
 * 对应手册：文件操作
 */
import { compute } from '../../core/fca.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

function getAllConventions(state) {
  const parts = [];
  if (state.seed?.conventions?.length) {
    parts.push(state.seed.conventions.map(c => `- ${c}`).join('\n'));
  }
  if (state.conventions) parts.push(state.conventions);
  return parts.join('\n');
}

// 保存
export function save(state, filePath, fs) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  console.log(cc(`  ${filePath}`, C.G));
  return true;
}

// 加载
export function open(state, filePath, fs) {
  try {
    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 检测 v0.9 格式并转换
    if (loaded.version || !loaded.dagNodes) {
      console.log(cc('  Detected v0.9 format, converting...', C.Y));
      convertV09(state, loaded);
    } else {
      Object.assign(state, loaded);
    }

    // 确保必要字段存在
    state.dagNodes = state.dagNodes || {};
    state.impls = state.impls || {};
    state.schemas = state.schemas || {};
    state.bindings = state.bindings || {};
    state.seed = state.seed || null;
    state.history = state.history || [];

    console.log(cc(`  Loaded ${filePath}`, C.G));
    return true;
  } catch (ex) {
    console.log(cc(`  ${ex}`, C.R));
    return false;
  }
}

// v0.9 转换
function convertV09(target, source) {
  target.objects = source.objects || {};
  target.attributes = source.attributes || {};
  target.incidence = {};
  target.bindings = source.bindings || {};
  target.conventions = source.conventions || '';
  target.dagNodes = {};
  target.currentHash = null;
  target.impls = {};
  target.schemas = {};
  target.seed = source.seed || null;
  target.history = source.history || [];
  target.round = 0;

  // 转换 incidence，? -> RW
  for (const [k, v] of Object.entries(source.incidence || {})) {
    if (v === '?' || v === '1' || v === 'YES' || v === 'TRUE') {
      target.incidence[k] = 'RW';
    } else if (v === '0' || v === 'NO' || v === 'FALSE' || v === 'NONE') {
      target.incidence[k] = '0';
    } else {
      target.incidence[k] = v;
    }
  }
}

// 导出 Markdown
export function exportMarkdown(state, filePath, fs) {
  const result = compute(state.objects, state.attributes, state.incidence);

  const lines = ['# FCA Spec\n'];
  const conv = getAllConventions(state);
  if (conv) lines.push(`## Conventions\n\`\`\`\n${conv}\n\`\`\`\n`);

  lines.push(`## Objects (${Object.keys(state.objects).length})\n`);
  lines.push('| ID | Name | Desc |\n|----|------|------|');
  for (const [o, ob] of Object.entries(state.objects)) {
    lines.push(`| ${o} | ${ob.name} | ${ob.desc || ''} |`);
  }

  lines.push(`\n## Attributes (${Object.keys(state.attributes).length})\n`);
  lines.push('| ID | Name | Binding |\n|----|------|---------|');
  for (const [a, at] of Object.entries(state.attributes)) {
    lines.push(`| ${a} | ${at.name} | ${state.bindings?.[a] || '-'} |`);
  }

  const aids = Object.keys(state.attributes).sort();
  lines.push(`\n## Incidence\n`);
  lines.push(`| |${aids.map(a => state.attributes[a].name.substring(0, 6)).join('|')}|\n`);
  lines.push(`|--${'|--'.repeat(aids.length)}|`);
  for (const o of Object.keys(state.objects).sort()) {
    const row = `| ${state.objects[o].name.substring(0, 14)} `;
    lines.push(row + aids.map(a => ` ${state.incidence[`${o}|${a}`] || '?'}`).join(' ') + ' |');
  }

  lines.push(`\n## Concepts (${result.concepts.length})\n`);
  const ml = Math.max(...result.layers, 0);
  for (let layer = 0; layer <= ml; layer++) {
    const lc = result.concepts.map((c, i) => [i, c]).filter(([, c], i) => result.layers[i] === layer);
    if (!lc.length) continue;
    lines.push(`### L${layer}\n`);
    for (const [idx, [ext, intn]] of lc) {
      const en = [...ext].map(o => state.objects[o]?.name || o).join(', ') || 'empty';
      const an = [...intn].map(a => state.attributes[a]?.name || a).join(', ') || 'empty';
      lines.push(`C${String(idx).padStart(2, '0')} ({${an}}, {${en}})`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(cc(`  ${filePath}`, C.G));
  return true;
}

// 手动重算
export function computeLattice(state) {
  const result = compute(state.objects, state.attributes, state.incidence);
  console.log(cc(`  |B|=${result.concepts.length}`, C.G));
  return result;
}
