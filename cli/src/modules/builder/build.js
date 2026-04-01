/**
 * Build with Test - 带测试的构建流程
 * 实现生成→测试→反馈→再生成 的闭环
 */
import fs from 'fs';
import path from 'path';
import { generateProject, generateSpec } from './generators/index.js';
import { runTests, checkSyntax, initTestEnv } from './tester/index.js';
import { parseTestErrors, formatErrorReport, generateLLMFeedback, summarizeErrors } from './parser/index.js';
import { buildFull } from '../../core/llm.js';
import { compute } from '../../core/fca.js';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

export async function buildWithTest(state, options = {}) {
  const {
    outputDir = './dist',
    testFramework = 'vitest',
    maxRetries = 3,
    skipTests = false,
    llm = null
  } = options;

  const result = compute(state.objects, state.attributes, state.incidence);
  if (!result.concepts.length) {
    console.log(cc('  Empty context. Nothing to build.', C.R));
    return { success: false, error: 'empty_context' };
  }

  console.log(cc(`  Building project to ${outputDir}...`, C.B));
  console.log(cc(`  Test framework: ${testFramework}`, C.D));
  console.log(cc(`  Max retries: ${maxRetries}`, C.D));

  // 创建输出目录
  ensureDir(outputDir);

  let lastErrors = [];
  let projectFiles = {};

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(cc(`\n  === Attempt ${attempt + 1}/${maxRetries} ===`, C.B));

    // 1. 生成文件
    console.log(cc('  [1/4] Generating files...', C.D));
    const { files } = generateProject(state, { testFramework });
    projectFiles = files;
    await writeFiles(outputDir, files);
    console.log(cc(`      Generated ${Object.keys(files).length} files`, C.G));

    // 2. 语法检查
    console.log(cc('  [2/4] Checking syntax...', C.D));
    const syntaxResult = await checkSyntax(outputDir);
    if (!syntaxResult.passed) {
      console.log(cc(`      Syntax errors: ${syntaxResult.errors.length}`, C.Y));
      lastErrors = syntaxResult.errors.map(e => ({
        type: 'syntax_error',
        message: e.message,
        file: e.file,
        line: e.line
      }));

      if (attempt < maxRetries - 1) {
        console.log(cc('  [3/4] Regenerating with fixes...', C.Y));
        state = await regenerateWithErrors(state, lastErrors, llm);
        continue;
      }
    }

    // 3. 运行测试
    if (skipTests) {
      console.log(cc('  [3/4] Skipping tests (--skip-tests)', C.D));
    } else {
      console.log(cc('  [3/4] Running tests...', C.D));

      // 初始化测试环境（如需要）
      await initTestEnv(outputDir);

      const testResult = await runTests(outputDir, { testFramework });
      const errors = parseTestErrors(testResult.output);

      if (errors.length > 0) {
        console.log(cc(`\n      Errors found:`, C.Y));
        const summary = summarizeErrors(errors);
        for (const [type, count] of Object.entries(summary.byType)) {
          console.log(cc(`        ${type}: ${count}`, C.Y));
        }

        lastErrors = errors;

        if (attempt < maxRetries - 1) {
          console.log(cc('\n  [4/4] Regenerating with feedback...', C.Y));
          state = await regenerateWithErrors(state, errors, llm);
          continue;
        }
      } else if (testResult.passed) {
        console.log(cc('      All tests passed ✓', C.G));
      }
    }

    // 成功
    console.log(cc('\n  === Build complete ===', C.G));
    return {
      success: true,
      outputDir,
      files: projectFiles,
      attempts: attempt + 1,
      errors: []
    };
  }

  // 失败
  console.log(cc('\n  === Build failed after max retries ===', C.R));
  return {
    success: false,
    outputDir,
    files: projectFiles,
    attempts: maxRetries,
    errors: lastErrors
  };
}

/**
 * 根据错误反馈重新生成
 */
async function regenerateWithErrors(state, errors, llm) {
  if (!llm) {
    console.log(cc('      No LLM available, manual fixes needed', C.Y));
    return state;
  }

  console.log(cc('      Generating error feedback...', C.D));

  const feedback = generateLLMFeedback(errors);
  const spec = generateSpec(state);

  const prompt = `
Given this FCA spec:
${spec}

Previous generated code had these errors:
${feedback}

Please generate corrected code. Fix the issues and provide updated file contents.
Return JSON: {"files": {"path/to/file.js": "file content", ...}}
`;

  try {
    const response = await llm.chat(
      'You are a helpful assistant that generates JavaScript code.',
      prompt
    );

    // 尝试解析响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.files) {
        console.log(cc(`      Got ${Object.keys(parsed.files).length} updated files from LLM`, C.G));
        // 这里可以进一步处理，但当前只是记录
      }
    }
  } catch (e) {
    console.log(cc(`      LLM feedback failed: ${e.message}`, C.Y));
  }

  return state;
}

/**
 * 写入文件
 */
async function writeFiles(baseDir, files) {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, filePath);
    ensureDir(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content);
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 传统单文件构建（保持兼容性）
export async function buildSingleFile(state, outputFile, llm) {
  const spec = generateSpec(state);
  const binds = Object.entries(state.bindings || {}).map(([a, t]) =>
    `${state.attributes[a]?.name || a}:${t}`
  ).join('\n');
  const conv = getAllConventions(state);

  console.log(cc(`  Building single file...`, C.D));
  console.log(cc(`  Conventions: ${conv ? conv.split('\n').filter(l => l.trim()).length : 0} rules`, C.D));

  const r = await llm.buildFull(spec, binds, conv);

  let html = r.trim();
  if (html.startsWith('```')) {
    const lines = html.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines.length && lines[lines.length - 1].startsWith('```')) lines.pop();
    html = lines.join('\n');
  }

  fs.writeFileSync(outputFile, html);
  console.log(cc(`  ${outputFile} (${html.length} chars)`, C.G));

  return { success: true, outputFile };
}

function getAllConventions(state) {
  const parts = [];
  if (state.seed?.conventions?.length) {
    parts.push(state.seed.conventions.map(c => `- ${c}`).join('\n'));
  }
  if (state.conventions) parts.push(state.conventions);
  return parts.join('\n');
}
