# Viewer 模块

## 功能说明

查看 KonceptOS 状态的各种视图。

## 命令列表

| 命令 | 说明 |
|------|------|
| `ctx` | 交叉表（Context Table） |
| `st` | 状态摘要 |
| `rw` | RW 格子列表 |
| `flows` | 数据流图 |
| `order` | 执行顺序（W→R 拓扑排序） |
| `conflicts` | 时序冲突检测 |
| `groups` | 编码分组 |
| `lat` | 概念格层级结构 |
| `concept <n>` | 查看概念详情 |
| `ts` | TypeScript 签名 |

## 使用示例

```bash
# 查看交叉表
konceptos ctx

# 查看状态摘要
konceptos st

# 查看 RW 格子
konceptos rw

# 查看数据流
konceptos flows

# 查看执行顺序
konceptos order

# 查看时序冲突
konceptos conflicts

# 查看编码分组
konceptos groups

# 查看概念格
konceptos lat

# 查看特定概念
konceptos concept 5

# 生成 TypeScript 签名
konceptos ts
```

## 三个停止条件

1. **No RW** - 所有 I 值已精化
2. **No temporal conflicts** - 偏序图无矛盾
3. **Schemas complete** - 所有活跃通道有 schema

三个条件都满足时可以安全地分模块 build + assemble。
