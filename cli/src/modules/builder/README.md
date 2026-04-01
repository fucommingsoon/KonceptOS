# Builder 模块

## 功能说明

全量构建，将完整 K spec 发送给 LLM 一次性生成应用。

## 命令列表

| 命令 | 说明 |
|------|------|
| `build [output.html]` | 将完整 K spec 发送给 LLM 生成完整应用 |

## 与 assemble 的区别

- **build**: 把整个 K spec 发给 LLM，LLM 生成完整应用。一次 LLM 调用，结果是一个完整的程序。
- **assemble**: 不调 LLM。把之前逐模块生成的 impl 加上从 K 机械生成的胶水代码拼在一起。

简单说：`build` 是一步到位，`assemble` 是拼积木。

## 使用场景

- **build**: 适合小项目或快速验证想法
- **assemble**: 适合正式项目，需要逐模块验证

## 使用示例

```bash
# 全量构建
konceptos build mygame.html
```
