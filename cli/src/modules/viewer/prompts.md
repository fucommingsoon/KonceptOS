# Viewer 模块提示词脚本

本目录包含状态查看相关的提示词模板。

## TypeScript 签名生成提示词

当执行 `ts` 命令时使用：

```
Generate TypeScript type definitions for these channels:

Channels:
{channel_list}

Each channel has:
- name
- schema (if defined)
- readers (modules that read it)
- writers (modules that write it)

Return TypeScript:
1. Channel type/interface for each channel
2. Contract interfaces for each module showing read/write/readwrite
```
