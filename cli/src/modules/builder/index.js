/**
 * Builder 模块 - 全量构建
 * 对应手册：全量构建
 *
 * 支持两种模式：
 * 1. buildSingleFile - 单文件生成（兼容旧版）
 * 2. buildWithTest - 多文件生成 + 测试验证
 */
import { buildWithTest, buildSingleFile } from './build.js';

// 全量构建（默认多文件+测试）
export async function build(state, outputFile, llm, fs, options = {}) {
  const { multiFile = true, testFramework = 'vitest', skipTests = false } = options;

  if (multiFile) {
    return await buildWithTest(state, {
      outputDir: outputFile,
      testFramework,
      skipTests,
      llm
    });
  } else {
    return await buildSingleFile(state, outputFile, llm, fs);
  }
}

export { buildWithTest, buildSingleFile };
