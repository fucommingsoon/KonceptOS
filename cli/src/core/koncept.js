/**
 * Koncept Core - K 核心状态管理
 * 对应手册：K 编辑、状态管理
 */
import { VALID_I } from './fca.js';
import { ensureDataDir, loadState, saveState } from './storage.js';

export const I_VALUES = VALID_I;
export { VALID_I };

export function createState() {
  return {
    // G: 对象集
    objects: {},
    // M: 属性集
    attributes: {},
    // I: 关联矩阵 { "F01|A": "RW" }
    incidence: {},
    // 属性类型定义
    schemas: {},
    // 技术绑定
    bindings: {},
    // 约定
    conventions: '',
    // 当前节点 hash
    currentHash: null,
    // DAG 节点
    dagNodes: {},
    // 实现 { moduleName: [{ code, comment, timestamp }] }
    impls: {},
    // 种子
    seed: null,
    // 历史
    history: [],
    round: 0
  };
}

export function loadKonceptState() {
  ensureDataDir();
  const state = loadState();
  if (state) return state;
  return createState();
}

export function saveKonceptState(state) {
  ensureDataDir();
  saveState(state);
}

// I 值验证
export function isValidI(val) {
  return VALID_I.has(val.toUpperCase());
}

export function normalizeI(val) {
  val = val.toUpperCase();
  if (['1', 'YES', 'TRUE'].includes(val)) return 'RW';
  if (['NO', 'FALSE', 'NONE', '0'].includes(val)) return '0';
  if (!VALID_I.has(val)) return null;
  return val;
}

// 统计
export function countRW(incidence) {
  return Object.values(incidence).filter(v => v === 'RW').length;
}

export function countG(state) {
  return Object.keys(state.objects).length;
}

export function countM(state) {
  return Object.keys(state.attributes).length;
}

export function getRWCells(incidence) {
  return Object.entries(incidence).filter(([, v]) => v === 'RW');
}

export function getUnknownCells(incidence) {
  return Object.entries(incidence).filter(([, v]) => v === '?');
}

// 一致性检查
export function checkConsistency(state) {
  const issues = [];
  for (const aid of Object.keys(state.attributes)) {
    const readers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'R' || v === 'RW';
    });
    const writers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'W' || v === 'RW';
    });
    if (readers.length && !writers.length) {
      issues.push(`"${state.attributes[aid].name}": ${readers.length} R, no W`);
    }
    if (writers.length && !readers.length) {
      issues.push(`"${state.attributes[aid].name}": ${writers.length} W, no R`);
    }
  }
  return issues;
}

// 时序冲突检测
export function detectTemporalConflicts(state) {
  // W -> R 偏序图
  const flows = [];
  for (const aid of Object.keys(state.attributes)) {
    const writers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'W' || v === 'RW';
    });
    const readers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'R' || v === 'RW';
    });
    for (const w of writers) {
      for (const r of readers) {
        if (w !== r) flows.push([w, aid, r]);
      }
    }
  }

  // 检测传递闭包中的环
  const graph = {};
  for (const [w, , r] of flows) {
    if (!graph[w]) graph[w] = new Set();
    graph[w].add(r);
  }

  const conflicts = [];
  const visited = new Set();
  const recStack = new Set();

  function dfs(node, path) {
    if (recStack.has(node)) {
      conflicts.push(path.slice(path.indexOf(node)));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    recStack.add(node);
    if (graph[node]) {
      for (const next of graph[node]) {
        dfs(next, [...path, next]);
      }
    }
    recStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    dfs(node, [node]);
  }

  return conflicts;
}

// 数据流
export function computeDataflows(state) {
  const flows = [];
  for (const aid of Object.keys(state.attributes)) {
    const writers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'W' || v === 'RW';
    });
    const readers = Object.keys(state.objects).filter(o => {
      const v = state.incidence[`${o}|${aid}`];
      return v === 'R' || v === 'RW';
    });
    for (const w of writers) {
      for (const r of readers) {
        if (w !== r) flows.push([w, aid, r]);
      }
    }
  }
  return flows;
}

// W -> R 拓扑排序
export function computeExecutionOrder(state) {
  const flows = computeDataflows(state);
  const graph = {};
  const inDegree = {};

  for (const [w, , r] of flows) {
    if (!graph[w]) graph[w] = [];
    graph[w].push(r);
    inDegree[r] = (inDegree[r] || 0) + 1;
    if (!(w in inDegree)) inDegree[w] = 0;
  }

  const queue = Object.keys(inDegree).filter(k => inDegree[k] === 0);
  const order = [];

  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    if (graph[node]) {
      for (const next of graph[node]) {
        inDegree[next]--;
        if (inDegree[next] === 0) queue.push(next);
      }
    }
  }

  return order;
}

// 编码分组
export function computeCodingGroups(state, concepts) {
  const groups = {};
  for (const [oid, ob] of Object.entries(state.objects)) {
    let best = -1, bestSize = -1;
    concepts.forEach(([ext, intn], idx) => {
      if (ext.has(oid) && intn.size > bestSize) {
        best = idx;
        bestSize = intn.size;
      }
    });
    if (best >= 0) {
      if (!groups[best]) groups[best] = [];
      groups[best].push(oid);
    }
  }
  return groups;
}

export { loadState, saveState, ensureDataDir };
