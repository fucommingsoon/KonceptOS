# DAG 模块

## 功能说明

DAG 版本管理，提供不可变快照和导航功能。

## 命令列表

| 命令 | 说明 |
|------|------|
| `commit [desc]` | 将当前 K 快照为不可变 DAG 节点 |
| `goto <hash>` | 导航到任意 DAG 节点（前缀匹配） |
| `undo` | 返回父节点 |
| `dag` | 显示 DAG 结构 |
| `path` | 从根节点到当前节点的路径 |
| `diff <hash_a> <hash_b>` | 对比两个 DAG 节点 |

## 概念说明

- 每个 commit 创建内容寻址的 hash
- DAG 节点不可变
- 支持前缀匹配跳转
- 回退后可以 fork 新路径，旧路径保留

## 使用示例

```bash
# 提交当前状态
konceptos commit resolved physics attributes

# 查看 DAG
konceptos dag

# 跳转到之前的节点
konceptos goto a3f8

# 回退一步
konceptos undo

# 查看路径
konceptos path

# 对比两个版本
konceptos diff a3f8 b7e2
```

## Hash 前缀匹配

支持前缀匹配，例如 `goto a3f8` 会匹配 `a3f8b2c10d4e`。
