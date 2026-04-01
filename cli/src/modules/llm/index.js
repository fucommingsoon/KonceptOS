/**
 * LLM 模块 - 大语言模型调用
 * 对应手册：llm analyze, impl, build
 */
import { extractGm, fillDirected, judgeOne, askExpansion, buildFull, generateImpl, analyzeRWUsage, chat, extractJson } from '../../core/llm.js';

export const llm = {
  extractGm,
  fillDirected,
  judgeOne,
  askExpansion,
  buildFull,
  generateImpl,
  analyzeRWUsage,
  chat,
  extractJson
};

// 导入所有 LLM 函数作为独立导出
export * from '../../core/llm.js';
