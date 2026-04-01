/**
 * Refine 模块 - 精化操作
 * 对应手册：精化
 */
import { countRW, normalizeI, VALID_I } from '../../core/koncept.js';
import { commit } from '../dag/index.js';
import { lookupObj, lookupAttr } from '../seed/index.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

// 拆分对象
export async function resolveObj(state, id, llm) {
  if (!state.objects[id]) {
    console.log(cc(`  No object: ${id}`, C.R));
    return false;
  }

  const ob = state.objects[id];
  const children = lookupObj(state, ob.name);

  let chList;
  if (children) {
    console.log(cc(`  Seed: ${ob.name} -> ${children.join(', ')}`, C.CN));
    chList = children.map(c => ({ name: c }));
  } else {
    console.log(cc('  No seed. Asking LLM...', C.D));
    const r = await llm.askExpansion(ob.name, ob.desc, 'object', state.seed?.obj_vocab);
    const d = llm.extractJson(r);
    if (!d?.expansions) {
      console.log(cc(`  Failed: ${r.substring(0, 200)}`, C.R));
      return false;
    }
    chList = d.expansions;
    console.log(cc(`  LLM: ${ob.name} -> ${chList.map(c => c.name).join(', ')}`, C.CN));
  }

  // 创建新对象
  const newIds = chList.map((c, i) => {
    let nid = `${id}_${i + 1}`;
    while (state.objects[nid]) nid += '_';
    state.objects[nid] = { name: c.name, desc: c.desc || '', solidified: false };
    for (const a of Object.keys(state.attributes)) {
      state.incidence[`${nid}|${a}`] = state.incidence[`${nid}|${a}`] || '?';
    }
    return nid;
  });

  // 为新对象填充 I 值
  for (const nid of newIds) {
    for (const aid of Object.keys(state.attributes)) {
      const parentVal = state.incidence[`${id}|${aid}`] || '0';
      if (parentVal === '0') {
        state.incidence[`${nid}|${aid}`] = '0';
        continue;
      }
      // 使用种子提示或 LLM 判断
      const hint = state.seed?.incidence_hints?.[`${state.objects[nid].name}|${state.attributes[aid].name}`] ||
        state.seed?.incidence_hints?.[`*|${state.attributes[aid].name}`];
      if (hint && VALID_I.has(hint)) {
        state.incidence[`${nid}|${aid}`] = hint;
        continue;
      }
      const v = await llm.judgeOne(
        state.objects[nid].name, state.objects[nid].desc,
        state.attributes[aid].name, state.attributes[aid].desc
      );
      state.incidence[`${nid}|${aid}`] = v;
    }
  }

  // 删除父对象
  delete state.objects[id];
  Object.keys(state.incidence).forEach(k => {
    if (k.startsWith(id + '|')) delete state.incidence[k];
  });

  state.round++;
  commit(state, `resolve obj ${id} -> ${newIds.join(', ')}`);

  console.log(cc(`  Done. |G|=${Object.keys(state.objects).length} RW=${countRW(state.incidence)}`, C.G));
  return true;
}

// 拆分属性
export async function resolveAttr(state, id, llm) {
  if (!state.attributes[id]) {
    console.log(cc(`  No attribute: ${id}`, C.R));
    return false;
  }

  const at = state.attributes[id];
  const children = lookupAttr(state, at.name);

  let chList;
  if (children) {
    console.log(cc(`  Seed: ${at.name} -> ${children.join(', ')}`, C.CN));
    chList = children.map(c => ({ name: c }));
  } else {
    console.log(cc('  No seed. Asking LLM...', C.D));
    const r = await llm.askExpansion(at.name, at.desc, 'attribute', state.seed?.attr_vocab);
    const d = llm.extractJson(r);
    if (!d?.expansions) {
      console.log(cc(`  Failed: ${r.substring(0, 200)}`, C.R));
      return false;
    }
    chList = d.expansions;
    console.log(cc(`  LLM: ${at.name} -> ${chList.map(c => c.name).join(', ')}`, C.CN));
  }

  // 保留旧绑定
  const oldBinding = state.bindings?.[id];

  // 创建新属性
  const newIds = chList.map((c, i) => {
    let nid = `${id}_${i + 1}`;
    while (state.attributes[nid]) nid += '_';
    state.attributes[nid] = { name: c.name, desc: c.desc || '' };
    if (oldBinding) {
      state.bindings = state.bindings || {};
      state.bindings[nid] = oldBinding;
    }
    for (const o of Object.keys(state.objects)) {
      state.incidence[`${o}|${nid}`] = state.incidence[`${o}|${nid}`] || '?';
    }
    return nid;
  });

  // 为新属性填充 I 值
  for (const oid of Object.keys(state.objects)) {
    const parentVal = state.incidence[`${oid}|${id}`] || '0';
    if (parentVal === '0') {
      newIds.forEach(nid => { state.incidence[`${oid}|${nid}`] = '0'; });
      continue;
    }
    for (const nid of newIds) {
      const hint = state.seed?.incidence_hints?.[`${state.objects[oid].name}|${state.attributes[nid].name}`] ||
        state.seed?.incidence_hints?.[`*|${state.attributes[nid].name}`];
      if (hint && VALID_I.has(hint)) {
        state.incidence[`${oid}|${nid}`] = hint;
        continue;
      }
      const v = await llm.judgeOne(
        state.objects[oid].name, state.objects[oid].desc,
        state.attributes[nid].name, state.attributes[nid].desc
      );
      state.incidence[`${oid}|${nid}`] = v;
    }
  }

  // 删除父属性
  delete state.attributes[id];
  if (state.bindings?.[id]) delete state.bindings[id];
  Object.keys(state.incidence).forEach(k => {
    if (k.endsWith('|' + id)) delete state.incidence[k];
  });

  state.round++;
  commit(state, `resolve attr ${id} -> ${newIds.join(', ')}`);

  console.log(cc(`  Done. |M|=${Object.keys(state.attributes).length} RW=${countRW(state.incidence)}`, C.G));
  return true;
}

// 自动精化
export async function evolve(state, n, llm) {
  const initRw = countRW(state.incidence);
  if (initRw === 0) {
    console.log(cc('  K* (RW=0)', C.G));
    return;
  }

  const mx = n === 'all' ? initRw * 3 : (parseInt(n) || 1);
  console.log(cc(`  === Evolve: ${initRw} RW ===`, C.B));

  for (let step = 1; step <= mx; step++) {
    const cells = Object.entries(state.incidence).filter(([, v]) => v === 'RW');
    if (!cells.length) {
      console.log(cc('\n  K* reached!', C.G, C.B));
      break;
    }

    // 找 RW 最多的对象
    const objRw = {};
    cells.forEach(([k]) => {
      const [o] = k.split('|');
      objRw[o] = (objRw[o] || 0) + 1;
    });

    const worst = Object.entries(objRw).sort((a, b) => b[1] - a[1])[0][0];
    const oname = state.objects[worst]?.name;

    // 查找种子或用 LLM
    const children = lookupObj(state, oname);
    let chList;

    if (children) {
      console.log(cc(`\n  [${step}] ${oname} -> ${children.join(', ')} (seed)`, C.CN));
      chList = children.map(c => ({ name: c }));
    } else {
      console.log(cc(`\n  [${step}] ${oname} (LLM)...`, C.Y));
      const r = await llm.askExpansion(oname, state.objects[worst]?.desc || '', 'object', state.seed?.obj_vocab);
      const d = llm.extractJson(r);
      if (!d?.expansions) {
        console.log(cc('    Failed, stopping', C.R));
        break;
      }
      chList = d.expansions;
      console.log(cc(`    -> ${chList.map(c => c.name).join(', ')}`, C.CN));
    }

    // 创建新对象
    const newIds = chList.map((c, i) => {
      let nid = `${worst}_${i + 1}`;
      while (state.objects[nid]) nid += '_';
      state.objects[nid] = { name: c.name, desc: c.desc || '', solidified: false };
      for (const a of Object.keys(state.attributes)) {
        state.incidence[`${nid}|${a}`] = state.incidence[`${nid}|${a}`] || '?';
      }
      return nid;
    });

    // 填充 I 值
    for (const nid of newIds) {
      for (const aid of Object.keys(state.attributes)) {
        const parentVal = state.incidence[`${worst}|${aid}`] || '0';
        if (parentVal === '0') {
          state.incidence[`${nid}|${aid}`] = '0';
          continue;
        }
        const v = await llm.judgeOne(
          state.objects[nid].name, state.objects[nid].desc,
          state.attributes[aid].name, state.attributes[aid].desc
        );
        state.incidence[`${nid}|${aid}`] = v;
      }
    }

    // 删除父对象
    delete state.objects[worst];
    Object.keys(state.incidence).forEach(k => {
      if (k.startsWith(worst + '|')) delete state.incidence[k];
    });

    state.round++;
    commit(state, `evolve ${step}`);

    const newRw = countRW(state.incidence);
    console.log(cc(`    RW: ${initRw} -> ${newRw}  |G|=${Object.keys(state.objects).length}`, newRw < initRw ? C.G : C.Y));
    if (newRw === 0) break;
  }

  console.log(cc(`\n  Final: RW=${countRW(state.incidence)}  |G|=${Object.keys(state.objects).length}`, C.G));
}
