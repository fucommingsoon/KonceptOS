# K-Editor 提示词脚本

本目录包含 K 编辑相关的 LLM 提示词模板。

## 使用方式

这些提示词在特定操作时由系统自动调用，不需要用户手动执行。

## 提示词列表

### 1. set 操作时的 LLM 判断

当用户执行 `set` 但未指定具体 I 值时，可以询问 LLM 获取建议：

```
Answer ONLY: 0, R, W, or RW

Object: {object_name} - {object_desc}
Attribute: {attr_name} - {attr_desc}
```

### 2. convention 补充

当添加 convention 时，LLM 可以帮助形式化约束：

```
Given this natural language constraint:
{constraint}

Convert to a semi-formal expression that can be mechanically verified.
Focus on: numerical constraints, bounds, invariants.

Return JSON: {"formal": "...", "check": "..."}
```
