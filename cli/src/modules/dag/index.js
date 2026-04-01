/**
 * DAG 模块 - 版本管理
 * 对应手册：DAG 导航
 */
import crypto from 'crypto';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

function computeHash(state) {
  const content = JSON.stringify({
    objects: state.objects,
    attributes: state.attributes,
    incidence: state.incidence,
    schemas: state.schemas,
    bindings: state.bindings
  });
  return crypto.createHash('sha1').update(content).digest('hex').substring(0, 12);
}

// 提交
export function commit(state, description = '') {
  const parentHash = state.currentHash;

  const node = {
    hash: null,
    parentHash,
    description,
    timestamp: new Date().toISOString(),
    state: {
      objects: { ...state.objects },
      attributes: { ...state.attributes },
      incidence: { ...state.incidence },
      schemas: { ...state.schemas },
      bindings: { ...state.bindings },
      impls: { ...state.impls }
    }
  };

  node.hash = computeHash(state);

  state.dagNodes = state.dagNodes || {};
  state.dagNodes[node.hash] = node;
  state.currentHash = node.hash;
  state.round++;

  console.log(cc(`  Committed: ${node.hash}`, C.G));
  return node;
}

// 跳转到节点
export function goto(state, hashPrefix) {
  const matched = Object.keys(state.dagNodes || {}).find(h => h.startsWith(hashPrefix));
  if (!matched) {
    console.log(cc(`  No node matching: ${hashPrefix}`, C.R));
    return null;
  }

  const node = state.dagNodes[matched];
  Object.assign(state.objects, node.state.objects);
  Object.assign(state.attributes, node.state.attributes);
  Object.assign(state.incidence, node.state.incidence);
  Object.assign(state.schemas, node.state.schemas || {});
  Object.assign(state.bindings, node.state.bindings || {});
  if (node.state.impls) Object.assign(state.impls, node.state.impls || {});

  state.currentHash = matched;

  console.log(cc(`  At ${matched} |G|=${Object.keys(state.objects).length} RW=${Object.values(state.incidence).filter(v => v === 'RW').length}`, C.G));
  return node;
}

// 回退
export function undo(state) {
  const current = state.dagNodes?.[state.currentHash];
  if (!current || !current.parentHash) {
    console.log(cc('  No parent to go back to', C.R));
    return null;
  }
  return goto(state, current.parentHash);
}

// 获取路径
export function getPath(state) {
  const path = [];
  let current = state.currentHash;
  while (current) {
    const node = state.dagNodes?.[current];
    if (!node) break;
    path.unshift(node);
    current = node.parentHash;
  }
  return path;
}

// 显示 DAG
export function showDag(state) {
  const nodes = state.dagNodes || {};
  if (!Object.keys(nodes).length) {
    console.log(cc('  Empty DAG.', C.D));
    return;
  }

  // 构建树结构
  const children = {};
  for (const [hash, node] of Object.entries(nodes)) {
    if (!children[node.parentHash]) children[node.parentHash] = [];
    children[node.parentHash].push(hash);
  }

  function renderNode(hash, prefix = '', isLast = true) {
    const node = nodes[hash];
    const marker = hash === state.currentHash ? cc('→', C.G) : ' ';
    const conn = isLast ? '└──' : '├──';
    console.log(`${prefix}${cc(conn, C.D)} ${marker} ${cc(hash, C.Y)} ${node.description || ''}`.trim());
  }

  function traverse(hash, prefix = '', isLast = true) {
    renderNode(hash, prefix, isLast);
    const childs = children[hash] || [];
    childs.forEach((child, i) => {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      traverse(child, newPrefix, i === childs.length - 1);
    });
  }

  // 找根节点
  const roots = Object.entries(nodes).filter(([, n]) => !n.parentHash).map(([h]) => h);
  roots.forEach((root, i) => {
    traverse(root, '', roots.length === 1);
  });
}

// 显示路径
export function showPath(state) {
  const path = getPath(state);
  if (!path.length) {
    console.log(cc('  Empty path.', C.D));
    return;
  }
  console.log(cc('  Path from root:', C.B));
  path.forEach((node, i) => {
    const marker = node.hash === state.currentHash ? cc('*', C.G) : ' ';
    console.log(`    ${marker} ${cc(node.hash, C.Y)} ${node.description || ''}`);
  });
}

// Diff
export function diff(state, hashA, hashB) {
  const nodeA = state.dagNodes?.[hashA];
  const nodeB = state.dagNodes?.[hashB];

  if (!nodeA || !nodeB) {
    console.log(cc('  Node not found', C.R));
    return;
  }

  const a = nodeA.state;
  const b = nodeB.state;

  console.log(cc(`  ${hashA} -> ${hashB}`, C.B));

  // Objects
  const addedObjs = Object.keys(b.objects).filter(k => !a.objects[k]);
  const removedObjs = Object.keys(a.objects).filter(k => !b.objects[k]);
  const changedObjs = Object.keys(a.objects).filter(k =>
    b.objects[k] && a.objects[k].name !== b.objects[k].name
  );

  if (addedObjs.length) console.log(`  +Objects: ${addedObjs.join(', ')}`);
  if (removedObjs.length) console.log(`  -Objects: ${removedObjs.join(', ')}`);
  if (changedObjs.length) console.log(`  ~Objects: ${changedObjs.map(o => `${o}(${a.objects[o].name}->${b.objects[o].name})`).join(', ')}`);

  // Incidence changes
  const allKeys = new Set([...Object.keys(a.incidence), ...Object.keys(b.incidence)]);
  const changes = [];
  let rwChange = 0;

  for (const key of allKeys) {
    const va = a.incidence[key] || '0';
    const vb = b.incidence[key] || '0';
    if (va !== vb) {
      if (va === 'RW') rwChange--;
      if (vb === 'RW') rwChange++;
      changes.push({ key, from: va, to: vb });
    }
  }

  if (changes.length) {
    console.log(cc(`  Changes (${changes.length}):`, C.Y));
    changes.slice(0, 10).forEach(({ key, from, to }) => {
      console.log(`    ${key}: ${from} -> ${to}`);
    });
    if (changes.length > 10) console.log(`    +${changes.length - 10} more`);
  }

  if (rwChange !== 0) {
    console.log(cc(`  RW change: ${rwChange > 0 ? '+' : ''}${rwChange}`, rwChange < 0 ? C.G : C.Y));
  }
}
