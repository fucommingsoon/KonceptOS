/**
 * Seed 模块 - 种子管理
 * 对应手册：种子
 */
import { Seed } from '../../core/seed.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

// 查看种子
export function showSeed(state) {
  const s = state.seed || {};
  const parts = [`Seed: ${s.domain || '(unnamed)'}`];

  if (s.obj_vocab?.length) parts.push(`  L1 obj vocab: ${s.obj_vocab.length}`);
  if (s.attr_vocab?.length) parts.push(`  L1 attr vocab: ${s.attr_vocab.length}`);
  if (s.obj_tree && Object.keys(s.obj_tree).length) parts.push(`  L2 obj tree: ${Object.keys(s.obj_tree).length} entries`);
  if (s.attr_tree && Object.keys(s.attr_tree).length) parts.push(`  L2 attr tree: ${Object.keys(s.attr_tree).length} entries`);
  if (s.incidence_hints && Object.keys(s.incidence_hints).length) parts.push(`  L2 hints: ${Object.keys(s.incidence_hints).length}`);
  if (s.conventions?.length) parts.push(`  L2 conventions: ${s.conventions.length} rules`);
  if (s.reference_k) parts.push(`  L3 reference K*: yes`);

  console.log(parts.join('\n'));
}

// 加载种子
export function loadSeed(state, filePath, fs) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const seed = new Seed();
    seed.from_dict(data);
    state.seed = seed.to_dict();
    console.log(cc(`  Loaded: ${seed.domain || '(unnamed)'}`, C.G));
    return true;
  } catch (ex) {
    console.log(cc(`  ${ex}`, C.R));
    return false;
  }
}

// 保存种子
export function saveSeed(state, filePath, fs) {
  if (!state.seed) {
    console.log(cc('  No seed to save', C.R));
    return false;
  }
  fs.writeFileSync(filePath, JSON.stringify(state.seed, null, 2));
  console.log(cc(`  ${filePath}`, C.G));
  return true;
}

// 显示分解树
export function showTree(state) {
  const ot = state.seed?.obj_tree || {};
  const at = state.seed?.attr_tree || {};

  if (Object.keys(ot).length) {
    console.log(cc('  Object tree:', C.CN));
    for (const k of Object.keys(ot)) {
      console.log(`    ${cc(k, C.Y)} -> ${ot[k].join(', ')}`);
    }
  }
  if (Object.keys(at).length) {
    console.log(cc('  Attribute tree:', C.M));
    for (const k of Object.keys(at)) {
      console.log(`    ${cc(k, C.Y)} -> ${at[k].join(', ')}`);
    }
  }
  if (!Object.keys(ot).length && !Object.keys(at).length) {
    console.log(cc('  Empty.', C.D));
  }
}

// 显示约定
export function showConv(state) {
  const conv = state.seed?.conventions || [];
  if (conv.length) {
    console.log(cc(`  Seed conventions (${conv.length}):`, C.CN));
    conv.forEach(c => console.log(`    - ${c}`));
  } else {
    console.log(cc('  No seed conventions.', C.D));
  }
}

// 设置分解规则
export function setRule(state, type, parent, children) {
  if (!state.seed) state.seed = new Seed().to_dict();

  if (type === 'obj') {
    state.seed.obj_tree = state.seed.obj_tree || {};
    state.seed.obj_tree[parent] = children;
    console.log(cc(`  ${parent} -> ${children.join(', ')}`, C.G));
  } else {
    state.seed.attr_tree = state.seed.attr_tree || {};
    state.seed.attr_tree[parent] = children;
    console.log(cc(`  ${parent} -> ${children.join(', ')}`, C.G));
  }
  return true;
}

// 查询对象分解
export function lookupObj(state, name) {
  const tree = state.seed?.obj_tree || {};
  if (tree[name]) return tree[name];
  const keys = Object.keys(tree);
  for (const k of keys) {
    if (k.includes(name) || name.includes(k)) return tree[k];
  }
  return null;
}

// 查询属性分解
export function lookupAttr(state, name) {
  const tree = state.seed?.attr_tree || {};
  if (tree[name]) return tree[name];
  const keys = Object.keys(tree);
  for (const k of keys) {
    if (k.includes(name) || name.includes(k)) return tree[k];
  }
  return null;
}
