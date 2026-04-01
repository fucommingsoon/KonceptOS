/**
 * DAG - 有向无环图版本管理
 * 对应手册：DAG 导航
 */
import crypto from 'crypto';

export function computeHash(state) {
  const content = JSON.stringify({
    objects: state.objects,
    attributes: state.attributes,
    incidence: state.incidence,
    schemas: state.schemas,
    bindings: state.bindings
  });
  return crypto.createHash('sha1').update(content).digest('hex').substring(0, 12);
}

export function createDagNode(state, parentHash, description) {
  const hash = computeHash(state);
  return {
    hash,
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
}

export function commit(state, description) {
  const parentHash = state.currentHash;
  const node = createDagNode(state, parentHash, description);
  state.dagNodes[node.hash] = node;
  state.currentHash = node.hash;
  state.round++;
  return node;
}

export function gotoNode(state, hashPrefix) {
  // 前缀匹配
  const matched = Object.keys(state.dagNodes).find(h => h.startsWith(hashPrefix));
  if (!matched) return null;

  const node = state.dagNodes[matched];
  Object.assign(state.objects, node.state.objects);
  Object.assign(state.attributes, node.state.attributes);
  Object.assign(state.incidence, node.state.incidence);
  Object.assign(state.schemas, node.state.schemas);
  Object.assign(state.bindings, node.state.bindings);
  if (node.state.impls) Object.assign(state.impls, node.state.impls);
  state.currentHash = matched;
  return node;
}

export function undo(state) {
  const current = state.dagNodes[state.currentHash];
  if (!current || !current.parentHash) return null;
  return gotoNode(state, current.parentHash);
}

export function getDagPath(state) {
  const path = [];
  let current = state.currentHash;
  while (current) {
    const node = state.dagNodes[current];
    if (!node) break;
    path.unshift(node);
    current = node.parentHash;
  }
  return path;
}

export function diff(nodeA, nodeB) {
  const a = nodeA.state;
  const b = nodeB.state;

  const diff = {
    objects: { added: [], removed: [], changed: [] },
    attributes: { added: [], removed: [], changed: [] },
    incidence: { changed: [] },
    rwChange: 0
  };

  // Objects
  for (const id of Object.keys(a.objects)) {
    if (!b.objects[id]) diff.objects.removed.push(id);
    else if (a.objects[id].name !== b.objects[id].name) {
      diff.objects.changed.push({ id, from: a.objects[id], to: b.objects[id] });
    }
  }
  for (const id of Object.keys(b.objects)) {
    if (!a.objects[id]) diff.objects.added.push(id);
  }

  // Attributes
  for (const id of Object.keys(a.attributes)) {
    if (!b.attributes[id]) diff.attributes.removed.push(id);
    else if (a.attributes[id].name !== b.attributes[id].name) {
      diff.attributes.changed.push({ id, from: a.attributes[id], to: b.attributes[id] });
    }
  }
  for (const id of Object.keys(b.attributes)) {
    if (!a.attributes[id]) diff.attributes.added.push(id);
  }

  // Incidence
  const allKeys = new Set([...Object.keys(a.incidence), ...Object.keys(b.incidence)]);
  for (const key of allKeys) {
    const va = a.incidence[key] || '0';
    const vb = b.incidence[key] || '0';
    if (va !== vb) {
      if (va === 'RW' || vb === 'RW') diff.rwChange += (va === 'RW' ? 1 : 0) - (vb === 'RW' ? 1 : 0);
      diff.incidence.changed.push({ key, from: va, to: vb });
    }
  }

  return diff;
}
