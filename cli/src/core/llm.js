/**
 * LLM - 大语言模型调用
 * 对应手册：llm analyze, impl, build
 */
const KONCEPTOS_API_KEY = process.env.KONCEPTOS_API_KEY || '';
const KONCEPTOS_MODEL = process.env.KONCEPTOS_MODEL || 'glm-5';
const KONCEPTOS_URL = process.env.KONCEPTOS_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

function extractJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  const s = text.substring(a, b + 1);
  try {
    return JSON.parse(s);
  } catch {
    const s2 = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    try {
      return JSON.parse(s2);
    } catch {
      return null;
    }
  }
}

async function ask(system, user, maxTokens = 4000) {
  if (!KONCEPTOS_API_KEY) return '(No API key: set KONCEPTOS_API_KEY env)';
  try {
    const { default: fetch } = await import('node-fetch');
    const body = JSON.stringify({
      model: KONCEPTOS_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    const resp = await fetch(KONCEPTOS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KONCEPTOS_API_KEY}`
      },
      body
    });
    const d = await resp.json();
    if (d?.error) return `(API error: ${d.error.message || JSON.stringify(d.error)})`;
    const ch = d?.choices || [];
    if (!ch.length) return `(no choices: ${JSON.stringify(d).substring(0, 300)})`;
    const content = ch[0]?.message?.content;
    if (!content) return `(empty response. usage: ${JSON.stringify(d.usage)?.substring(0, 100)})`;
    return content;
  } catch (e) {
    if (e?.cause?.code === 'ENOTFOUND') return '(Network error: cannot reach bigmodel.cn)';
    return `(${e.message})`;
  }
}

// 提取对象和属性
export async function extractGm(text) {
  return ask(
    `Extract OBJECTS and ATTRIBUTES from the document.
ATTRIBUTES = high-level concern dimensions (~6-12).
Return JSON with format:
{"objects":[{"id":"F01","name":"...","desc":"..."}],"attributes":[{"id":"A","name":"...","desc":"..."}]}`,
    text,
    8192
  );
}

// 填充方向矩阵
export async function fillDirected(text, ops, aps) {
  return ask(
    `For each (object,attribute) determine: 0/R/W/RW.
0 = not involved, R = read-only, W = write-only, RW = read-write.
Per object: comma-separated values in attribute order.
Return JSON: {"F01":"R,0,W,RW,...",...}`,
    `Objects: ${ops.map(([id, n]) => `${id}(${n})`).join(', ')}\nAttributes: ${aps.map(([id, n]) => `${id}(${n})`).join(', ')}\nDoc:\n${text}`,
    16384
  );
}

// 单格判断
export async function judgeOne(on, od, an, ad) {
  const r = (await ask(
    'Answer ONLY: 0, R, W, or RW',
    `Object: ${on} - ${od}\nAttribute: ${an} - ${ad}`,
    10
  )).trim().toUpperCase();
  for (const v of ['RW', 'R', 'W', '0']) {
    if (r.includes(v)) return v;
  }
  return '0';
}

// 拆分扩展
export async function askExpansion(name, desc, kind, vocabHint) {
  const vhint = vocabHint?.length ? `\nChoose from or be inspired by: ${vocabHint.join(', ')}` : '';
  const s = `'${name}' compresses multiple distinct ${kind}s.\nList 2-5 conceptually different sub-${kind}s (NOT R/W splits).${vhint}\n\nReturn JSON: {"expansions":[{"name":"...","desc":"..."},...]}`;
  return ask(s, `Name: ${name}\nDesc: ${desc}`, 1000);
}

// 全量构建
export async function buildFull(spec, binds, conventions) {
  let s = `Generate a COMPLETE RUNNABLE single-file HTML+JS webapp from this FCA spec.
RW means both reads and writes. Follow the lattice structure.
Output ONLY the HTML. No markdown fences.
`;
  if (conventions) s += `=== CRITICAL CONSTRAINTS (must satisfy ALL) ===\n${conventions}\n\n`;
  s += spec;
  if (binds) s += '\n\nTech Bindings:\n' + binds;
  return ask(s, 'Generate the HTML app now.', 128000);
}

// 模块实现生成
export async function generateImpl(moduleName, desc, contracts, schemas, conventions, upstream, downstream, prevImpls) {
  let prompt = `Generate JavaScript/HTML implementation for module: ${moduleName}\n`;
  prompt += `Description: ${desc}\n\n`;

  prompt += `Contracts (channels this module uses):\n`;
  prompt += `  Reads: ${contracts.reads.join(', ') || '(none)'}\n`;
  prompt += `  Writes: ${contracts.writes.join(', ') || '(none)'}\n`;
  prompt += `  Read-Writes: ${contracts.readwrites.join(', ') || '(none)'}\n\n`;

  if (schemas) {
    prompt += `Schema definitions:\n`;
    for (const [name, schema] of Object.entries(schemas)) {
      prompt += `  ${name}: ${schema}\n`;
    }
    prompt += '\n';
  }

  if (conventions) {
    prompt += `Conventions:\n${conventions}\n\n`;
  }

  if (upstream?.length) {
    prompt += `Upstream modules (write channels I read): ${upstream.join(', ')}\n`;
  }
  if (downstream?.length) {
    prompt += `Downstream modules (read channels I write): ${downstream.join(', ')}\n`;
  }

  if (prevImpls?.length) {
    prompt += `\nPrevious implementations:\n`;
    prevImpls.forEach((impl, i) => {
      prompt += `\n--- impl #${i} ---\n${impl.code}\n`;
    });
    prompt += `\nGenerate an improved version or a different approach.\n`;
  }

  return ask(prompt, `Generate the implementation for ${moduleName}.`, 32000);
}

// 分析 RW 使用
export async function analyzeRWUsage(moduleName, code, channels) {
  let prompt = `Analyze this implementation for RW channel usage:\n\n`;
  prompt += `Module: ${moduleName}\n\n`;
  prompt += `Code:\n${code}\n\n`;
  prompt += `Channels: ${JSON.stringify(channels)}\n\n`;
  prompt += `For each RW channel, identify:\n`;
  prompt += `  - Fields read only (could be R)\n`;
  prompt += `  - Fields written only (could be W)\n`;
  prompt += `  - Suggest splitting if mixed usage\n`;

  return ask(prompt, 'Analyze RW usage and suggest splits.', 8000);
}

// 通用对话
export async function chat(system, user) {
  return ask(system, user);
}

export { extractJson };
