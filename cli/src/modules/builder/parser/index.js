/**
 * Error Parser - 错误解析器
 * 从测试输出中提取可操作的错误信息
 */

/**
 * 解析测试输出，返回错误列表
 */
export function parseTestErrors(output) {
  const errors = [];

  // Jest 格式: "FAIL src/test.js\n  Error: message"
  errors.push(...parseJestErrors(output));

  // Vitest 格式
  errors.push(...parseVitestErrors(output));

  // Node.js 语法错误: "SyntaxError: Unexpected token"
  errors.push(...parseSyntaxErrors(output));

  // Node.js 运行时错误: "ReferenceError: x is not defined"
  errors.push(...parseRuntimeErrors(output));

  // TypeScript 错误（如果有）
  errors.push(...parseTypeScriptErrors(output));

  return errors;
}

/**
 * 解析 Jest 错误
 */
function parseJestErrors(output) {
  const errors = [];

  // FAIL src/test.js
  //   Error: expect(received).toBe(expected)
  const failBlocks = output.match(/FAIL\s+([^\n]+)\n[\s\S]*?(?=\nPASS\s|\nFAIL\s|$)/g);

  if (failBlocks) {
    for (const block of failBlocks) {
      const fileMatch = block.match(/FAIL\s+([^\n]+)/);
      const file = fileMatch ? fileMatch[1] : 'unknown';

      // 提取错误信息
      const errorLines = block.match(/Error:\s*(.+)/g);
      if (errorLines) {
        for (const errLine of errorLines) {
          const msg = errLine.replace(/Error:\s*/, '');
          errors.push({
            type: 'test_failure',
            file,
            message: msg,
            raw: errLine
          });
        }
      }
    }
  }

  return errors;
}

/**
 * 解析 Vitest 错误
 */
function parseVitestErrors(output) {
  const errors = [];

  // FAIL  src/test.js > test name
  //   Error: message
  const failBlocks = output.match(/FAIL\s+([^\n]+)\s*>\s*(.+)\n\s+Error:\s*(.+)/g);

  if (failBlocks) {
    for (const block of failBlocks) {
      const match = block.match(/FAIL\s+([^\s]+)\s*>\s*(.+)\n\s+Error:\s*(.+)/);
      if (match) {
        errors.push({
          type: 'test_failure',
          file: match[1],
          test: match[2],
          message: match[3],
          raw: block
        });
      }
    }
  }

  return errors;
}

/**
 * 解析语法错误
 */
function parseSyntaxErrors(output) {
  const errors = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // SyntaxError: Unexpected token
    const syntaxMatch = line.match(/SyntaxError:\s*(.+)/i);
    if (syntaxMatch && !line.includes('expect(')) {
      errors.push({
        type: 'syntax_error',
        message: syntaxMatch[1],
        raw: line
      });
    }
  }

  return errors;
}

/**
 * 解析运行时错误
 */
function parseRuntimeErrors(output) {
  const errors = [];

  // ReferenceError: x is not defined
  const runtimeMatch = output.match(/(ReferenceError|TypeError|RangeError|EvalError|URIError):\s*(.+)/g);

  if (runtimeMatch) {
    for (const match of runtimeMatch) {
      const parts = match.match(/(ReferenceError|TypeError|RangeError|EvalError|URIError):\s*(.+)/);
      if (parts) {
        errors.push({
          type: parts[1].toLowerCase(),
          message: parts[2],
          raw: match
        });
      }
    }
  }

  // 带堆栈的错误
  const stackMatch = output.match(/([A-Z][a-z]+Error):\s*(.+)\n\s+at\s+.+\(([^:]+):(\d+):(\d+)\)/g);
  if (stackMatch) {
    for (const match of stackMatch) {
      const detailMatch = match.match(/([A-Z][a-z]+Error):\s*(.+)\n\s+at\s+.+\(([^:]+):(\d+):(\d+)\)/);
      if (detailMatch) {
        errors.push({
          type: detailMatch[1].toLowerCase(),
          message: detailMatch[2],
          file: detailMatch[3],
          line: parseInt(detailMatch[4]),
          column: parseInt(detailMatch[5]),
          raw: match
        });
      }
    }
  }

  return errors;
}

/**
 * 解析 TypeScript 错误
 */
function parseTypeScriptErrors(output) {
  const errors = [];

  // TS2345: Argument of type 'string' is not assignable to type 'number'
  const tsMatch = output.match(/TS\d+:\s*(.+)/g);

  if (tsMatch) {
    for (const match of tsMatch) {
      const msg = match.replace(/TS\d+:\s*/, '');
      errors.push({
        type: 'type_error',
        message: msg,
        raw: match
      });
    }
  }

  return errors;
}

/**
 * 生成错误摘要
 */
export function summarizeErrors(errors) {
  const summary = {
    total: errors.length,
    byType: {},
    byFile: {}
  };

  for (const err of errors) {
    // 按类型统计
    summary.byType[err.type] = (summary.byType[err.type] || 0) + 1;

    // 按文件统计
    if (err.file) {
      summary.byFile[err.file] = summary.byFile[err.file] || [];
      summary.byFile[err.file].push(err);
    }
  }

  return summary;
}

/**
 * 生成错误报告
 */
export function formatErrorReport(errors) {
  if (errors.length === 0) {
    return 'No errors found.';
  }

  const lines = [];
  const summary = summarizeErrors(errors);

  lines.push(`Total errors: ${summary.total}`);
  lines.push('');

  // 按文件分组显示
  if (Object.keys(summary.byFile).length > 0) {
    lines.push('Errors by file:');
    for (const [file, fileErrors] of Object.entries(summary.byFile)) {
      lines.push(`  ${file}:`);
      for (const err of fileErrors) {
        const location = err.line ? `:${err.line}` : '';
        lines.push(`    - [${err.type}] ${err.message}${location}`);
      }
    }
  } else {
    // 按类型分组显示
    for (const [type, count] of Object.entries(summary.byType)) {
      lines.push(`${type}: ${count}`);
    }
    lines.push('');
    lines.push('Error details:');
    for (const err of errors) {
      lines.push(`  - [${err.type}] ${err.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * 生成 LLM 反馈
 */
export function generateLLMFeedback(errors, context = '') {
  const feedback = [];

  if (context) {
    feedback.push(`Context: ${context}`);
    feedback.push('');
  }

  feedback.push('Errors found:');
  for (const err of errors) {
    const parts = [`  - ${err.type}`];

    if (err.file) parts.push(`in ${err.file}`);
    if (err.line) parts.push(`line ${err.line}`);
    if (err.test) parts.push(`test "${err.test}"`);

    parts.push(`: ${err.message}`);

    feedback.push(parts.join(' '));
  }

  feedback.push('');
  feedback.push('Please fix these errors and regenerate the code.');

  return feedback.join('\n');
}
