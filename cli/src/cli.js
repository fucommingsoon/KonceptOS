/**
 * KonceptOS CLI v2.0
 * K -> K* by vocabulary replacement + redescription
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

// Core
import { createState, loadKonceptState, saveKonceptState, countRW, VALID_I, normalizeI } from './core/koncept.js';
import { compute } from './core/fca.js';

// Modules
import * as kEditor from './modules/k-editor/index.js';
import * as viewer from './modules/viewer/index.js';
import * as dag from './modules/dag/index.js';
import * as seed from './modules/seed/index.js';
import * as refine from './modules/refine/index.js';
import * as impl from './modules/impl/index.js';
import * as builder from './modules/builder/index.js';
import * as fileops from './modules/fileops/index.js';
import * as llm from './modules/llm/index.js';

const PKG = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

const DATA_DIR = '.konceptos';
const STATE_FILE = path.join(DATA_DIR, 'state.json');

function ensureDataDir() {
  const dp = path.join(process.cwd(), DATA_DIR);
  if (!fs.existsSync(dp)) fs.mkdirSync(dp, { recursive: true });
  return dp;
}

function loadState() {
  const fp = path.join(process.cwd(), DATA_DIR, STATE_FILE);
  if (fs.existsSync(fp)) {
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      // 确保 v2.0 格式
      if (!data.dagNodes) data.dagNodes = {};
      if (!data.impls) data.impls = {};
      if (!data.schemas) data.schemas = {};
      if (!data.bindings) data.bindings = {};
      if (!data.history) data.history = [];
      if (!data.seed) data.seed = null;
      return data;
    } catch {}
  }
  return createState();
}

function saveState(state) {
  ensureDataDir();
  const fp = path.join(process.cwd(), DATA_DIR, STATE_FILE);
  fs.writeFileSync(fp, JSON.stringify(state, null, 2));
}

// Wrapper: commands that modify state
function withState(fn) {
  return async (...args) => {
    let state = loadState();
    await fn(state, ...args);
    saveState(state);
  };
}

// Wrapper: read-only state commands
function withStateRO(fn) {
  return (...args) => {
    const state = loadState();
    fn(state, ...args);
  };
}

function log(state, act, detail) {
  state.history = state.history || [];
  state.history.push({ round: state.round, time: new Date().toLocaleTimeString(), act, detail });
  if (state.history.length > 300) state.history = state.history.slice(-300);
}

// 输出当前状态
function showResult(state) {
  console.log('');
  viewer.showCtx(state);
  viewer.showStatus(state);
}

// ── Help ──

function showHelp() {
  console.log(`
  ================================================================
   KonceptOS v${PKG.version} CLI
   K -> K* by vocabulary replacement + redescription
   Data: ${DATA_DIR}/ (in current working directory)
  ================================================================

  K Editing:
    add obj <id> <name> [-d desc]   add attr <id> <name> [-d desc]
    set <oid> <aid> <0|R|W|RW>      row <oid> R,0,W,RW,...
    del obj|attr <id>               schema <attr_id> <type>
    convention [text...]

  View:
    ctx        Context table
    st         Status summary
    rw         RW cells
    flows      Dataflows
    order      Execution order
    conflicts  Temporal conflicts
    groups     Coding groups
    lat        Concept lattice
    concept <n> Concept detail
    ts         TypeScript signatures

  DAG:
    commit [desc]   Snapshot current state
    goto <hash>     Navigate to node (prefix match)
    undo            Go to parent node
    dag             Show DAG structure
    path            Show path from root
    diff <a> <b>    Diff two nodes

  Seed:
    seed              Show seed info
    seed load <file>  Load seed
    seed save <file>  Save seed
    seed tree         Show decomposition trees
    seed conv         Show seed conventions
    seed set obj|attr <parent> <child1>...

  Refine:
    resolve obj|attr <id>   Expand concept
    evolve [n|all]          Auto-refine

  Impl:
    impl <module> [comment]  Generate implementation
    impls [module]           List implementations
    impl show <module> <n>   Show specific impl
    ready                    Show coverage
    assemble [out.html]     Assemble from impls
    analyze <module>         Analyze RW usage

  Build:
    build [out]       Full LLM build (multi-file with tests)
    build --single    Single HTML file build

  LLM:
    llm analyze <file>  Extract G,M,I from doc
    llm ask            Fill unknowns interactively
    llm chat <msg>     General chat

  File:
    save <file>  open <file>  export <file.md>
    compute      Compute lattice

  Environment:
    KONCEPTOS_API_KEY   API key
    KONCEPTOS_MODEL     Model (default: glm-5)
    KONCEPTOS_URL       API URL
  `);
}

// ── Program ──

const program = new Command();
program.version(PKG.version);
program.action(showHelp);

// ── K Editing ──

program.command('add')
  .argument('<type>', 'obj|attr')
  .argument('<id>')
  .argument('<name>')
  .option('-d, --desc <text>', 'description')
  .action(withState(async (state, type, id, name, opts) => {
    if (type === 'obj') {
      kEditor.addObj(state, id, name, opts.desc || '');
    } else {
      kEditor.addAttr(state, id, name, opts.desc || '');
    }
    dag.commit(state, `add ${type} ${id}`);
    showResult(state);
  }));

program.command('set')
  .argument('<oid>')
  .argument('<aid>')
  .argument('<val>')
  .action(withState(async (state, oid, aid, val) => {
    kEditor.setI(state, oid, aid, val);
    showResult(state);
  }));

program.command('row')
  .argument('<oid>')
  .argument('<vals>')
  .action(withState(async (state, oid, vals) => {
    kEditor.rowSet(state, oid, vals);
    showResult(state);
  }));

program.command('del')
  .argument('<type>', 'obj|attr')
  .argument('<id>')
  .action(withState(async (state, type, id) => {
    kEditor.del(state, type, id);
    dag.commit(state, `del ${type} ${id}`);
    showResult(state);
  }));

program.command('schema')
  .argument('<aid>')
  .argument('<type>')
  .action(withState(async (state, aid, type) => {
    kEditor.setSchema(state, aid, type);
    showResult(state);
  }));

program.command('convention')
  .argument('[text...]', 'convention text')
  .action(withState(async (state, text) => {
    kEditor.setConvention(state, text.join(' '));
    showResult(state);
  }));

// ── View ──

program.command('ctx').action(withStateRO((state) => viewer.showCtx(state)));
program.command('st').action(withStateRO((state) => viewer.showStatus(state)));
program.command('rw').action(withStateRO((state) => viewer.showRW(state)));
program.command('flows').action(withStateRO((state) => viewer.showFlows(state)));
program.command('order').action(withStateRO((state) => viewer.showOrder(state)));
program.command('conflicts').action(withStateRO((state) => viewer.showConflicts(state)));
program.command('groups').action(withStateRO((state) => viewer.showGroups(state)));
program.command('lat').alias('lattice').action(withStateRO((state) => viewer.showLattice(state)));
program.command('concept').argument('<n>').action(withStateRO((state, n) => viewer.showConcept(state, parseInt(n))));
program.command('ts').action(withStateRO((state) => viewer.showTS(state)));

// ── DAG ──

program.command('commit')
  .argument('[desc]', 'description')
  .action(withState(async (state, desc) => {
    dag.commit(state, desc || '');
    showResult(state);
  }));

program.command('goto')
  .argument('<hash>')
  .action(withState(async (state, hash) => {
    dag.goto(state, hash);
    showResult(state);
  }));

program.command('undo').action(withState(async (state) => {
  dag.undo(state);
  showResult(state);
}));

program.command('dag').action(withStateRO((state) => dag.showDag(state)));
program.command('path').action(withStateRO((state) => dag.showPath(state)));
program.command('diff')
  .argument('<a>')
  .argument('<b>')
  .action(withStateRO((state, a, b) => dag.diff(state, a, b)));

// ── Seed ──

const seedCmd = program.command('seed');
seedCmd.action(withStateRO((state) => seed.showSeed(state)));
seedCmd.command('load').argument('<file>').action(withState(async (state, fp) => {
  seed.loadSeed(state, fp, fs);
  seed.showSeed(state);
  console.log('');
  showResult(state);
}));
seedCmd.command('save').argument('<file>').action(withState(async (state, fp) => {
  seed.saveSeed(state, fp, fs);
}));
seedCmd.command('tree').action(withStateRO((state) => seed.showTree(state)));
seedCmd.command('conv').action(withStateRO((state) => seed.showConv(state)));
seedCmd.command('set')
  .argument('<type>', 'obj|attr')
  .argument('<parent>')
  .argument('<children...>')
  .action(withState(async (state, type, parent, children) => {
    seed.setRule(state, type, parent, children);
  }));

// ── Refine ──

const resolveCmd = program.command('resolve');
resolveCmd.command('obj').argument('<id>').action(withState(async (state, id) => {
  await refine.resolveObj(state, id, llm);
  showResult(state);
}));
resolveCmd.command('attr').argument('<id>').action(withState(async (state, id) => {
  await refine.resolveAttr(state, id, llm);
  showResult(state);
}));

program.command('evolve')
  .argument('[n]', 'number of iterations or "all"', '1')
  .action(withState(async (state, n) => {
    await refine.evolve(state, n, llm);
    showResult(state);
  }));

// ── Impl ──

const implCmd = program.command('impl');
implCmd.argument('<module>')
  .argument('[comment...]', 'comment')
  .action(withState(async (state, module, comment) => {
    await impl.impl(state, module, comment?.join(' '), llm);
  }));
implCmd.command('show')
  .argument('<module>')
  .argument('<n>')
  .action(withStateRO((state, module, n) => impl.showImpl(state, module, n)));

program.command('impls')
  .argument('[module]', 'module name')
  .action(withStateRO((state, module) => impl.listImpls(state, module)));

program.command('ready').action(withStateRO((state) => impl.ready(state)));

program.command('assemble')
  .argument('[out]', 'output file', 'index.html')
  .action(withState(async (state, out) => {
    impl.assembleCmd(state, out, fs);
  }));

program.command('analyze')
  .argument('<module>')
  .action(withState(async (state, module) => {
    await impl.analyze(state, module, llm);
  }));

// ── Build ──

program.command('build')
  .argument('[out]', 'output file/directory', 'dist')
  .option('--single', 'Generate single HTML file instead of multi-file project')
  .option('--skip-tests', 'Skip running tests')
  .option('--test-framework <framework>', 'Test framework: vitest or jest', 'vitest')
  .action(withState(async (state, out, opts) => {
    const options = {
      multiFile: !opts.single,
      testFramework: opts.testFramework,
      skipTests: opts.skipTests
    };
    await builder.build(state, out, llm, fs, options);
  }));

// ── LLM ──

const llmCmd = program.command('llm');

llmCmd.command('analyze')
  .argument('<file>')
  .action(withState(async (state, fp) => {
    try {
      const content = fs.readFileSync(fp, 'utf8');
      console.log(cc('  [1/2] Extracting G,M...', C.D));
      const r1 = await llm.extractGm(content);
      const d1 = llm.extractJson(r1);
      if (!d1) {
        console.log(cc(`  Step 1 failed: ${r1.substring(0, 300)}`, C.R));
        return;
      }
      for (const obj of (d1.objects || [])) {
        if (obj.id) {
          kEditor.addObj(state, obj.id, obj.name || obj.id, obj.desc || '');
        }
      }
      for (const attr of (d1.attributes || [])) {
        if (attr.id) {
          kEditor.addAttr(state, attr.id, attr.name || attr.id, attr.desc || '');
        }
      }
      const op = Object.entries(state.objects).map(([id, o]) => [id, o.name]);
      const ap = Object.entries(state.attributes).map(([id, a]) => [id, a.name]);
      if (op.length && ap.length) {
        console.log(cc(`  [2/2] ${op.length}x${ap.length} directed I...`, C.D));
        const r2 = await llm.fillDirected(content, op, ap);
        const d2 = llm.extractJson(r2);
        if (!d2) {
          console.log(cc(`  Step 2 failed: ${r2}`, C.Y));
          console.log(cc(`  Run 'konceptos llm ask' to fill manually`, C.Y));
        } else {
          const aids = Object.keys(state.attributes).sort();
          let cnt = 0;
          for (const [key, val] of Object.entries(d2)) {
            if (state.objects[key] && typeof val === 'string') {
              val.split(',').map(v => v.trim().toUpperCase()).forEach((v, i) => {
                if (i < aids.length && VALID_I.has(v)) {
                  state.incidence[`${key}|${aids[i]}`] = v;
                  cnt++;
                }
              });
            }
          }
          console.log(cc(`  Filled ${cnt} cells`, C.G));
        }
      }
      dag.commit(state, `llm analyze ${fp}`);
      showResult(state);
    } catch (ex) {
      console.log(cc(`  ${ex}`, C.R));
    }
  }));

llmCmd.command('ask').action(withState(async (state) => {
  const unknowns = Object.entries(state.incidence).filter(([, v]) => v === '?');
  if (!unknowns.length) {
    console.log(cc('  Complete!', C.G));
    return;
  }
  console.log(cc(`  ${unknowns.length} unknowns. Options: 0/R/W/RW=set, s=skip(LLM), sa=skip-all(LLM), q=quit`, C.D));

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  let skipAll = false;
  for (const [k] of unknowns) {
    const [o, a] = k.split('|');
    const on = state.objects[o]?.name || o;
    const an = state.attributes[a]?.name || a;
    if (skipAll) {
      const v = await llm.judgeOne(on, state.objects[o]?.desc || '', an, state.attributes[a]?.desc || '');
      state.incidence[k] = v;
      console.log(`    ${cc(on, C.CN)} x ${cc(an, C.M)} = ${v}`);
      continue;
    }
    const ans = (await question(`    ${cc(on, C.CN)} x ${cc(an, C.M)} ? `)).trim().toUpperCase();
    if (ans === 'Q') break;
    if (ans === 'SA' || ans === 'SKIPALL') {
      skipAll = true;
      const v = await llm.judgeOne(on, state.objects[o]?.desc || '', an, state.attributes[a]?.desc || '');
      state.incidence[k] = v;
      console.log(`    = ${v}`);
    } else if (ans === 'S' || ans === 'SKIP') {
      const v = await llm.judgeOne(on, state.objects[o]?.desc || '', an, state.attributes[a]?.desc || '');
      state.incidence[k] = v;
      console.log(`    = ${v}`);
    } else if (VALID_I.has(ans)) {
      state.incidence[k] = ans;
    }
  }
  rl.close();
  dag.commit(state, 'llm ask');
  showResult(state);
}));

llmCmd.command('chat')
  .argument('<message...>', 'message')
  .action(async (message) => {
    const r = await llm.chat('FCA assistant.', Array.isArray(message) ? message.join(' ') : message);
    console.log('  ' + r.replace(/\n/g, '\n  '));
  });

// ── File ──

program.command('save')
  .argument('<file>')
  .action(withState(async (state, fp) => {
    fileops.save(state, fp, fs);
  }));

program.command('open')
  .argument('<file>')
  .action(withState(async (state, fp) => {
    fileops.open(state, fp, fs);
    showResult(state);
  }));

program.command('export')
  .argument('<file>')
  .action(withState(async (state, fp) => {
    fileops.exportMarkdown(state, fp, fs);
  }));

program.command('compute').action(withStateRO((state) => {
  fileops.computeLattice(state);
}));

// ── Parse ──

program.parse(process.argv);
