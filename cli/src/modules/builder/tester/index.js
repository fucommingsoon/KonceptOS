/**
 * Test Runner - 测试运行器
 * 运行测试并返回结果
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const C = { RST: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m', R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', BL: '\x1b[34m', M: '\x1b[35m', CN: '\x1b[36m' };
const cc = (t, ...c) => c.join('') + t + C.RST;

export async function runTests(projectDir, options = {}) {
  const {
    testFramework = 'vitest',
    timeout = 60000
  } = options;

  console.log(cc('  Running tests...', C.D));

  return new Promise((resolve) => {
    const args = testFramework === 'vitest'
      ? ['vitest', '--reporter=json']
      : ['jest', '--json'];

    const proc = spawn('npx', args, {
      cwd: projectDir,
      stdio: 'pipe',
      timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const result = {
        passed: code === 0,
        code,
        stdout,
        stderr,
        output: stdout + stderr
      };

      if (result.passed) {
        console.log(cc('  Tests passed ✓', C.G));
      } else {
        console.log(cc('  Tests failed ✗', C.R));
      }

      resolve(result);
    });

    proc.on('error', (err) => {
      resolve({
        passed: false,
        code: -1,
        stdout: '',
        stderr: err.message,
        output: err.message,
        error: err.message
      });
    });

    // 超时处理
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill();
        resolve({
          passed: false,
          code: -1,
          stdout,
          stderr: 'Test timeout',
          output: stdout + '\nTimeout after ' + timeout + 'ms',
          error: 'timeout'
        });
      }
    }, timeout);
  });
}

// 语法检查（不运行测试）
export async function checkSyntax(projectDir) {
  console.log(cc('  Checking syntax...', C.D));

  const errors = [];

  // 检查所有 .js 文件
  const jsFiles = findJsFiles(path.join(projectDir, 'src'));
  for (const file of jsFiles) {
    try {
      // 尝试读取文件检查语法
      const content = fs.readFileSync(file, 'utf8');
      // 简单的语法检查
      checkJsSyntax(content, file, errors);
    } catch (e) {
      errors.push({
        type: 'read_error',
        file,
        message: e.message
      });
    }
  }

  if (errors.length === 0) {
    console.log(cc('  Syntax OK ✓', C.G));
  } else {
    console.log(cc(`  Syntax errors: ${errors.length}`, C.R));
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

function findJsFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkJsSyntax(content, file, errors) {
  // 基本语法检查
  const lines = content.split('\n');

  // 检查括号匹配
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过字符串和注释
    const cleanLine = line.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '""').replace(/\/\/.*/g, '');

    for (const char of cleanLine) {
      if (char in pairs) {
        stack.push({ char, line: i + 1 });
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (last && pairs[last.char] !== char) {
          errors.push({
            type: 'syntax_error',
            file,
            line: i + 1,
            message: `Unexpected ${char}, expected ${pairs[last.char]}`
          });
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    errors.push({
      type: 'syntax_error',
      file,
      line: unclosed.line,
      message: `Unclosed ${unclosed.char}`
    });
  }
}

// 初始化测试环境
export async function initTestEnv(projectDir) {
  console.log(cc('  Installing dependencies...', C.D));

  return new Promise((resolve) => {
    const proc = spawn('npm', ['install'], {
      cwd: projectDir,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0, code });
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}
