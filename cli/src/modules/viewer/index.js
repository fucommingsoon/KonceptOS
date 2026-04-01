/**
 * Viewer 模块 - 查看 K 状态
 * 对应手册：查看 K
 */
import { compute } from '../../core/fca.js';
import { countRW, checkConsistency, detectTemporalConflicts, computeDataflows, computeExecutionOrder, computeCodingGroups } from '../../core/koncept.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

// 交叉表
export function showCtx(state) {
  const oids = Object.keys(state.objects).sort();
  const aids = Object.keys(state.attributes).sort();
  if (!oids.length || !aids.length) {
    console.log(cc('  Empty.', C.D));
    return;
  }
  let nw = Math.max(18, ...oids.map(o => state.objects[o].name.length)) + 6;
  let hdr = ' '.repeat(nw);
  for (const a of aids) hdr += cc(state.attributes[a].name.substring(0, 5).padStart(6), C.CN);
  console.log(cc('  +' + '-'.repeat(nw + aids.length * 6) + '+', C.D));
  console.log('  |' + hdr + '|');
  console.log(cc('  +' + '-'.repeat(nw + aids.length * 6) + '+', C.D));
  for (const o of oids) {
    const ob = state.objects[o];
    const lbl = ` ${cc(o, C.Y)} ${ob.name}`;
    const row = lbl + ' '.repeat(Math.max(0, nw - lbl.length));
    let line = '  |' + row;
    for (const a of aids) {
      const v = state.incidence[`${o}|${a}`] || '?';
      if (v === 'RW') line += cc(' RW  ', C.G, C.B) + ' ';
      else if (v === 'R') line += cc('  R   ', C.CN);
      else if (v === 'W') line += cc('  W   ', C.M);
      else if (v === '0') line += cc('  .   ', C.D);
      else line += cc('  ?   ', C.R);
    }
    console.log(line + '|');
  }
  console.log(cc('  +' + '-'.repeat(nw + aids.length * 6) + '+', C.D));
}

// 状态摘要
export function showStatus(state) {
  const rw = countRW(state.incidence);
  const unk = Object.values(state.incidence).filter(v => v === '?').length;
  const G = Object.keys(state.objects).length;
  const M = Object.keys(state.attributes).length;
  const result = compute(state.objects, state.attributes, state.incidence);

  console.log(cc(`  K: |G|=${G} |M|=${M} RW=${rw} ?=${unk} |B|=${result.concepts.length}`, C.B));

  if (rw === 0 && unk === 0) {
    console.log(cc('  K* reached', C.G, C.B));
  } else {
    if (rw) console.log(cc(`  ${rw} RW = ${rw} compressions to resolve`, C.Y));
    if (unk) console.log(cc(`  ${unk} unknowns`, C.R));
  }

  const issues = checkConsistency(state);
  for (const c of issues) console.log(`  ! ${cc(c, C.Y)}`);

  if (state.seed?.domain) {
    console.log(cc(`  Seed: ${state.seed.domain}`, C.CN));
  } else {
    console.log(cc('  Seed: none', C.D));
  }

  // Schema 覆盖率
  const activeAttrs = Object.keys(state.attributes);
  const schemaCount = Object.keys(state.schemas || {}).filter(a => activeAttrs.includes(a)).length;
  console.log(cc(`  Schemas: ${schemaCount}/${activeAttrs}`, C.CN));
}

// RW 格子
export function showRW(state) {
  const cells = Object.entries(state.incidence).filter(([, v]) => v === 'RW');
  if (!cells.length) {
    console.log(cc('  RW=0 (K*)', C.G));
    return;
  }
  const byObj = {};
  cells.forEach(([k]) => {
    const [o, a] = k.split('|');
    if (!byObj[o]) byObj[o] = [];
    byObj[o].push(a);
  });
  console.log(cc(`  ${cells.length} RW:`, C.Y));
  for (const [o, aids] of Object.entries(byObj)) {
    const attrs = aids.map(a => state.attributes[a]?.name || a).join(', ');
    console.log(`    ${cc(state.objects[o]?.name || o, C.CN)} (${aids.length}): ${cc(attrs, C.M)}`);
  }
}

// 数据流
export function showFlows(state) {
  const fl = computeDataflows(state);
  if (!fl.length) {
    console.log(cc('  None.', C.D));
    return;
  }
  fl.forEach(([w, a, r]) => {
    console.log(`  ${cc(state.objects[w]?.name || w, C.CN)} -[${cc(state.attributes[a]?.name || a, C.M)}]-> ${cc(state.objects[r]?.name || r, C.G)}`);
  });
}

// 执行顺序
export function showOrder(state) {
  const order = computeExecutionOrder(state);
  if (!order.length) {
    console.log(cc('  None.', C.D));
    return;
  }
  console.log(cc(`  Execution order:`, C.B));
  order.forEach((oid, i) => {
    console.log(`    ${i + 1}. ${cc(state.objects[oid]?.name || oid, C.CN)}`);
  });
}

// 时序冲突
export function showConflicts(state) {
  const conflicts = detectTemporalConflicts(state);
  if (!conflicts.length) {
    console.log(cc('  No temporal conflicts', C.G));
    return;
  }
  console.log(cc(`  ${conflicts.length} conflicts detected:`, C.R));
  conflicts.forEach((path, i) => {
    console.log(`    Conflict ${i + 1}: ${path.join(' -> ')}`);
  });
}

// 编码分组
export function showGroups(state) {
  const result = compute(state.objects, state.attributes, state.incidence);
  const groups = computeCodingGroups(state, result.concepts);

  console.log(cc(`  ${Object.keys(groups).length} groups:`, C.B));
  for (const [cidx, oids] of Object.entries(groups)) {
    const names = oids.map(o => state.objects[o]?.name || o).join(', ');
    const ext = result.concepts[parseInt(cidx)]?.[0] || new Set();
    const intn = result.concepts[parseInt(cidx)]?.[1] || new Set();
    console.log(`  C${cidx.padStart(2, '0')} L${result.layers[parseInt(cidx)] || 0} [${[...intn].map(a => state.attributes[a]?.name || a).join(',')}]: ${cc(names, C.CN)}`);
  }
}

// 概念格
export function showLattice(state) {
  const result = compute(state.objects, state.attributes, state.incidence);
  if (!result.concepts.length) {
    console.log(cc('  Empty.', C.D));
    return;
  }
  const ml = Math.max(...result.layers, 0);
  console.log(cc(`  B(K): ${result.concepts.length} concepts`, C.B));
  const tags = ['T', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  for (let layer = 0; layer <= ml; layer++) {
    const lc = result.concepts.map((c, i) => [i, c]).filter(([, c], i) => result.layers[i] === layer);
    if (!lc.length) continue;
    console.log(cc(`  -- ${tags[layer] || 'L' + layer} --`, C.BL));
    for (const [idx, [ext, intn]] of lc) {
      const en = [...ext].map(o => (state.objects[o]?.name || o).substring(0, 12)).join(',');
      const an = [...intn].map(a => (state.attributes[a]?.name || a).substring(0, 8)).join(',');
      console.log(`    C${String(idx).padStart(2, '0')} {${cc(an, C.M)}} <- {${cc(en.substring(0, 30), C.CN)}}`);
    }
  }
}

// 概念详情
export function showConcept(state, idx) {
  const result = compute(state.objects, state.attributes, state.incidence);
  if (isNaN(idx) || idx < 0 || idx >= result.concepts.length) {
    console.log(cc('  Bad index', C.R));
    return;
  }
  const [ext, intn] = result.concepts[idx];
  const layer = result.layers[idx] || 0;
  console.log(cc(`  C${String(idx).padStart(2, '0')} L${layer}`, C.B));
  console.log(cc('  Intent:', C.M));
  for (const a of [...intn].sort()) console.log(`    ${state.attributes[a]?.name || a}`);
  console.log(cc('  Extent:', C.CN));
  for (const o of [...ext].sort()) {
    const dirs = [...intn].sort().map(a => `${(state.attributes[a]?.name || a).substring(0, 4)}:${state.incidence[`${o}|${a}`] || '?'}`);
    console.log(`    ${state.objects[o]?.name || o}  ${cc(dirs.join(' '), C.D)}`);
  }
}

// TypeScript 签名
export function showTS(state) {
  const lines = ['// TypeScript Contracts'];
  lines.push('');

  // Channel 类型
  lines.push('// Channels');
  for (const [aid, attr] of Object.entries(state.attributes)) {
    lines.push(`// Channel ${attr.name} (${aid})`);
    if (state.schemas?.[aid]) {
      lines.push(`type ${attr.name} = ${state.schemas[aid]};`);
    } else {
      lines.push(`type ${attr.name} = Record<string, any>;`);
    }
  }
  lines.push('');

  // Module Contracts
  lines.push('// Module Contracts');
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
    lines.push(`// ${obj.name}`);
    if (reads.length) lines.push(`//   reads: ${reads.join(', ')}`);
    if (writes.length) lines.push(`//   writes: ${writes.join(', ')}`);
    if (readwrites.length) lines.push(`//   readwrites: ${readwrites.join(', ')}`);
  }

  console.log(lines.join('\n'));
}
