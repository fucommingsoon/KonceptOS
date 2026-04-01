# FileOps 模块

## 功能说明

文件操作命令。

## 命令列表

| 命令 | 说明 |
|------|------|
| `save <file>` | 保存完整状态到文件 |
| `open <file>` | 加载状态（自动检测 v2.0 或 v0.9 格式） |
| `export <file.md>` | 导出当前 K 为 Markdown spec 文档 |
| `compute` | 手动触发概念格重算 |

## save

保存完整 DAG 状态（所有节点、边、impl）。

## open

加载状态，自动检测格式：
- v2.0 DAG 格式
- v0.9 格式（自动转换，`?` 值转为 `RW`）

## export

导出当前 K 为 Markdown spec 文档，便于分享和审查。

## compute

手动触发概念格重算。概念格主要用于 `groups`（编码分组）和 `lat`（可视化）。其他功能（topo sort、consistency check、assemble）不依赖概念格。

## 使用示例

```bash
# 保存状态
konceptos save myproject.json

# 打开状态
konceptos open myproject.json

# 导出 Markdown
konceptos export spec.md

# 手动重算
konceptos compute
```
