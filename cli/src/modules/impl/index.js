/**
 * Impl 模块 - 实现与组装
 * 对应手册：Impl 与组装
 */
import { assemble } from '../../core/assembler.js';
import { computeDataflows } from '../../core/koncept.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

// 生成实现
export async function impl(state, moduleName, comment, llm) {
  const obj = Object.values(state.objects).find(o => o.name === moduleName);
  if (!obj) {
    console.log(cc(`  Module not found: ${moduleName}`, C.R));
    return false;
  }

  // 计算契约
  const contracts = { reads: [], writes: [], readwrites: [] };
  const attrMap = {};

  for (const [aid, attr] of Object.entries(state.attributes)) {
    attrMap[attr.name] = aid;
    const v = state.incidence[`${obj.name}|${aid}`] || '0';
    if (v === 'R') contracts.reads.push(attr.name);
    else if (v === 'W') contracts.writes.push(attr.name);
    else if (v === 'RW') contracts.readwrites.push(attr.name);
  }

  // 获取 schema
  const schemas = {};
  for (const aid of Object.keys(state.attributes)) {
    if (state.schemas?.[aid]) {
      schemas[state.attributes[aid].name] = state.schemas[aid];
    }
  }

  // 获取约定
  let conventions = '';
  if (state.seed?.conventions?.length) {
    conventions += state.seed.conventions.join('\n');
  }
  if (state.conventions) {
    conventions += '\n' + state.conventions;
  }

  // 计算上下游
  const flows = computeDataflows(state);
  const upstream = [];
  const downstream = [];

  for (const [w, a, r] of flows) {
    if (r === obj.name && !upstream.includes(w)) upstream.push(w);
    if (w === obj.name && !downstream.includes(r)) downstream.push(r);
  }

  // 获取之前的实现
  const prevImpls = state.impls?.[moduleName] || [];

  console.log(cc(`  Generating impl for ${moduleName}...`, C.D));

  const code = await llm.generateImpl(
    moduleName,
    obj.desc || moduleName,
    contracts,
    schemas,
    conventions,
    upstream,
    downstream,
    prevImpls
  );

  // 存储实现
  state.impls = state.impls || {};
  if (!state.impls[moduleName]) state.impls[moduleName] = [];
  state.impls[moduleName].push({
    code,
    comment: comment || '',
    timestamp: new Date().toISOString()
  });

  console.log(cc(`  impl #${state.impls[moduleName].length - 1} (${code.length} chars)`, C.G));
  return true;
}

// 列出实现
export function listImpls(state, moduleName) {
  if (moduleName) {
    const impls = state.impls?.[moduleName];
    if (!impls || !impls.length) {
      console.log(cc(`  No impls for ${moduleName}`, C.D));
      return;
    }
    console.log(cc(`  ${moduleName} (${impls.length} impls):`, C.B));
    impls.forEach((impl, i) => {
      const marker = i === impls.length - 1 ? cc('*', C.G) : ' ';
      console.log(`    ${marker} #${i} ${impl.comment || '(no comment)'} (${impl.code.length} chars)`);
    });
  } else {
    // 列出所有模块
    const modules = Object.keys(state.objects);
    console.log(cc(`  Impl coverage:`, C.B));
    for (const mod of modules) {
      const impls = state.impls?.[mod] || [];
      const marker = impls.length > 0 ? cc('✓', C.G) : cc('✗', C.R);
      console.log(`    ${marker} ${mod} (${impls.length} impl${impls.length !== 1 ? 's' : ''})`);
    }
  }
}

// 显示实现
export function showImpl(state, moduleName, n) {
  const impls = state.impls?.[moduleName];
  if (!impls || !impls.length) {
    console.log(cc(`  No impls for ${moduleName}`, C.D));
    return;
  }
  const idx = parseInt(n);
  if (isNaN(idx) || idx < 0 || idx >= impls.length) {
    console.log(cc(`  Invalid impl index. Use 0-${impls.length - 1}`, C.R));
    return;
  }
  console.log(impls[idx].code);
}

// 就绪状态
export function ready(state) {
  const modules = Object.keys(state.objects);
  let covered = 0;

  console.log(cc(`  Impl coverage:`, C.B));
  for (const mod of modules) {
    const impls = state.impls?.[mod] || [];
    if (impls.length > 0) covered++;
    const marker = impls.length > 0 ? cc('✓', C.G) : cc('✗', C.R);
    console.log(`    ${marker} ${mod} (${impls.length} impl${impls.length !== 1 ? 's' : ''})`);
  }

  console.log(cc(`\n  ${covered}/${modules.length} modules covered`, covered === modules.length ? C.G : C.Y));
  return covered === modules.length;
}

// 组装
export function assembleCmd(state, outputFile, fs) {
  console.log(cc(`  Assembling...`, C.D));

  const result = assemble(state, outputFile, fs);

  if (fs) {
    console.log(cc(`  ${outputFile} (${result.code.length} chars)`, C.G));
  }

  return result;
}

// 分析 RW 使用
export async function analyze(state, moduleName, llm) {
  const impls = state.impls?.[moduleName];
  if (!impls || !impls.length) {
    console.log(cc(`  No impls for ${moduleName}`, C.D));
    return;
  }

  const latest = impls[impls.length - 1];

  // 找出该模块的 RW 通道
  const obj = Object.values(state.objects).find(o => o.name === moduleName);
  if (!obj) return;

  const rwChannels = [];
  for (const [aid, attr] of Object.entries(state.attributes)) {
    const v = state.incidence[`${moduleName}|${aid}`];
    if (v === 'RW') {
      rwChannels.push({
        name: attr.name,
        schema: state.schemas?.[aid] || 'Record<string, any>'
      });
    }
  }

  if (!rwChannels.length) {
    console.log(cc(`  No RW channels for ${moduleName}`, C.G));
    return;
  }

  console.log(cc(`  Analyzing RW usage for ${moduleName}:`, C.B));

  const analysis = await llm.analyzeRWUsage(moduleName, latest.code, rwChannels);
  console.log(analysis);
}
