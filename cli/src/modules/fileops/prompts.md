# FileOps 模块提示词脚本

本目录包含文件操作相关的提示词。

FileOps 模块不直接使用 LLM 提示词，它主要是状态序列化/反序列化操作。

## 格式转换

### v0.9 到 v2.0 转换

v0.9 格式：
```json
{
  "objects": { "F01": { "name": "..." } },
  "attributes": { "A": { "name": "..." } },
  "incidence": { "F01|A": "?" }
}
```

v2.0 格式转换规则：
- `?` → `RW`
- `1`/`YES`/`TRUE` → `RW`
- `0`/`NO`/`FALSE`/`NONE` → `0`
- 其他值保持不变

### Schema 转换

v0.9 没有 schemas 字段，v2.0 需要初始化空的 schemas。
