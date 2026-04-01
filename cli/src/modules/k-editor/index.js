/**
 * K-Editor 模块 - K 编辑命令
 * 对应手册：K 编辑
 */
import { normalizeI, isValidI, countRW, countG, countM } from '../../core/koncept.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

function log(state, act, detail) {
  state.history = state.history || [];
  state.history.push({ round: state.round, time: new Date().toLocaleTimeString(), act, detail });
  if (state.history.length > 300) state.history = state.history.slice(-300);
}

// 添加对象
export function addObj(state, id, name, desc = '') {
  if (state.objects[id]) {
    console.log(cc(`  对象 ${id} 已存在`, C.R));
    return false;
  }
  state.objects[id] = { name, desc, solidified: false };
  // 为新对象初始化 I 值
  for (const a of Object.keys(state.attributes)) {
    state.incidence[`${id}|${a}`] = state.incidence[`${id}|${a}`] || 'RW';
  }
  log(state, 'add_obj', `${id}: ${name}`);
  console.log(cc(`  +${id} ${name}`, C.G));
  return true;
}

// 添加属性
export function addAttr(state, id, name, desc = '') {
  if (state.attributes[id]) {
    console.log(cc(`  属性 ${id} 已存在`, C.R));
    return false;
  }
  state.attributes[id] = { name, desc };
  // 为新属性初始化 I 值
  for (const o of Object.keys(state.objects)) {
    state.incidence[`${o}|${id}`] = state.incidence[`${o}|${id}`] || 'RW';
  }
  log(state, 'add_attr', `${id}: ${name}`);
  console.log(cc(`  +${id} ${name}`, C.G));
  return true;
}

// 设置单个 I 值
export function setI(state, oid, aid, val) {
  const normalized = normalizeI(val);
  if (!normalized) {
    console.log(cc('  使用 0/R/W/RW', C.R));
    return false;
  }
  if (!state.objects[oid]) {
    console.log(cc(`  对象 ${oid} 不存在`, C.R));
    return false;
  }
  if (!state.attributes[aid]) {
    console.log(cc(`  属性 ${aid} 不存在`, C.R));
    return false;
  }
  state.incidence[`${oid}|${aid}`] = normalized;
  log(state, 'set', `${oid}|${aid}=${normalized}`);
  console.log(cc('  OK', C.G));
  return true;
}

// 批量设置一行
export function rowSet(state, oid, vals) {
  if (!state.objects[oid]) {
    console.log(cc('  对象不存在', C.R));
    return false;
  }
  const aids = Object.keys(state.attributes).sort();
  let cnt = 0;
  vals.split(',').map(v => v.trim().toUpperCase()).forEach((v, i) => {
    if (i < aids.length) {
      const normalized = normalizeI(v);
      if (normalized) {
        state.incidence[`${oid}|${aids[i]}`] = normalized;
        cnt++;
      }
    }
  });
  log(state, 'row', `${oid}: ${cnt} cells`);
  console.log(cc(`  OK (${cnt})`, C.G));
  return true;
}

// 删除对象或属性
export function del(state, type, id) {
  if (type === 'obj') {
    if (!state.objects[id]) {
      console.log(cc(`  对象 ${id} 不存在`, C.R));
      return false;
    }
    delete state.objects[id];
    // 删除相关 I 值
    state.incidence = Object.fromEntries(
      Object.entries(state.incidence).filter(([k]) => !k.startsWith(id + '|'))
    );
    log(state, 'del_obj', id);
    console.log(cc(`  -${id}`, C.G));
  } else if (type === 'attr') {
    if (!state.attributes[id]) {
      console.log(cc(`  属性 ${id} 不存在`, C.R));
      return false;
    }
    delete state.attributes[id];
    delete state.bindings?.[id];
    // 删除相关 I 值
    state.incidence = Object.fromEntries(
      Object.entries(state.incidence).filter(([k]) => !k.endsWith('|' + id))
    );
    log(state, 'del_attr', id);
    console.log(cc(`  -${id}`, C.G));
  }
  return true;
}

// 设置 schema
export function setSchema(state, aid, schema) {
  if (!state.attributes[aid]) {
    console.log(cc(`  属性 ${aid} 不存在`, C.R));
    return false;
  }
  state.schemas = state.schemas || {};
  state.schemas[aid] = schema;
  log(state, 'schema', `${aid}: ${schema}`);
  console.log(cc(`  Schema ${aid} = ${schema}`, C.G));
  return true;
}

// convention 操作
export function setConvention(state, text) {
  if (text) {
    state.conventions = text;
    console.log(cc(`  Set (${state.conventions.length} chars)`, C.G));
  } else {
    if (state.conventions) {
      console.log(state.conventions);
    } else {
      console.log(cc('  (empty)', C.D));
    }
  }
  return true;
}

// 获取约定文本
export function getAllConventions(state) {
  const parts = [];
  if (state.seed?.conventions?.length) {
    parts.push(state.seed.conventions.map(c => `- ${c}`).join('\n'));
  }
  if (state.conventions) parts.push(state.conventions);
  return parts.join('\n');
}
