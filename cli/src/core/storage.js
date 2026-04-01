/**
 * Storage - 状态持久化
 * 对应手册：save, open, export
 */
import fs from 'fs';
import path from 'path';

export const DATA_DIR = '.konceptos';
export const STATE_FILE = 'state.json';

export function getDataPath() {
  return path.join(process.cwd(), DATA_DIR);
}

export function ensureDataDir() {
  const dp = getDataPath();
  if (!fs.existsSync(dp)) fs.mkdirSync(dp, { recursive: true });
  return dp;
}

export function loadState() {
  const fp = path.join(process.cwd(), DATA_DIR, STATE_FILE);
  if (fs.existsSync(fp)) {
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {}
  }
  return null;
}

export function saveState(state) {
  ensureDataDir();
  const fp = path.join(getDataPath(), STATE_FILE);
  fs.writeFileSync(fp, JSON.stringify(state, null, 2));
}

export function saveToFile(state, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

export function loadFromFile(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

export function exportToMarkdown(state, filePath) {
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
    lines.push(`| ${a} | ${at.name} | ${state.bindings[a] || '-'} |`);
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
  return filePath;
}

function compute(objects, attributes, incidence) {
  // 简化的 compute，实际应调用 fca.js
  const oids = Object.keys(objects);
  const aids = Object.keys(attributes);
  if (!oids.length || !aids.length) return { concepts: [], edges: [], layers: [] };

  const involved = (o, a) => {
    const v = incidence[`${o}|${a}`];
    return v === 'R' || v === 'W' || v === 'RW';
  };

  const _intent = (ext) => {
    if (!ext.size) return new Set(aids);
    let r = new Set(aids);
    for (const o of ext) r = new Set([...r].filter(a => involved(o, a)));
    return r;
  };

  const _extent = (intn) => {
    if (!intn.size) return new Set(oids);
    let r = new Set(oids);
    for (const a of intn) r = new Set([...r].filter(o => involved(o, a)));
    return r;
  };

  const seen = new Set();
  const concepts = [];
  const cands = [new Set()];
  for (const o of oids) cands.push(new Set([o]));
  for (const ext of cands) {
    const intn = _intent(ext);
    const closed = _extent(intn);
    const key = `${[...closed].sort().join(',')}|${[...intn].sort().join(',')}`;
    if (!seen.has(key)) {
      seen.add(key);
      concepts.push([closed, intn]);
    }
  }

  return { concepts, edges: [], layers: new Array(concepts.length).fill(0) };
}

function getAllConventions(state) {
  const parts = [];
  if (state.seed?.conventions?.length) parts.push(state.seed.conventions.map(c => `- ${c}`).join('\n'));
  if (state.conventions) parts.push(state.conventions);
  return parts.join('\n');
}
