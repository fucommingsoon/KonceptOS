# Impl 模块提示词脚本

本目录包含实现生成和分析相关的提示词。

## 模块实现生成

```
Generate JavaScript/HTML implementation for module: {module_name}

Description: {desc}

Contracts (channels this module uses):
  Reads: {reads}
  Writes: {writes}
  Read-Writes: {readwrites}

Schema definitions:
{schemas}

Conventions:
{conventions}

Upstream modules (write channels I read): {upstream}
Downstream modules (read channels I write): {downstream}

Previous implementations:
{prev_impls}

Generate an improved version or a different approach.
```

## RW 使用分析

```
Analyze this implementation for RW channel usage:

Module: {module_name}

Code:
{code}

Channels: {channels}

For each RW channel, identify:
  - Fields read only (could be R)
  - Fields written only (could be W)
  - Suggest splitting if mixed usage
```

## 通道访问模式检测

用于 analyze 命令的正则模式：

```javascript
// 读通道
state.read('channel').field
state.read('channel')['field']

// 写通道
state.write('channel', { field: value })
state.read('channel').field = value
```
