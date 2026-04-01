# Refine 模块

## 功能说明

精化对象和属性，消解 RW 格子。

## 命令列表

| 命令 | 说明 |
|------|------|
| `resolve obj <id>` | 拆分对象 |
| `resolve attr <id>` | 拆分属性 |
| `evolve [n\|all]` | 自动精化 |

## resolve obj

拆分对象时：
1. 优先查种子的分解树
2. 没有则询问 LLM
3. 用户确认后执行

新对象的 I 值从父对象继承，RW 格子通过 LLM 重新判断。

## resolve attr

拆分属性时：
1. 优先查种子的分解树
2. 没有则询问 LLM
3. 用户确认后执行

## evolve

自动精化模式：
- 找 RW 最多的对象
- 尝试拆分
- `evolve 3` 做 3 轮
- `evolve all` 做到 RW=0 或无法继续

## 使用示例

```bash
# 拆分对象
konceptos resolve obj F13

# 拆分属性
konceptos resolve attr game_state

# 自动精化
konceptos evolve
konceptos evolve 3
konceptos evolve all
```

## 注意事项

- evolve 只拆对象不拆属性
- 属性拆分需要手动 `resolve attr`
- 每次 resolve 自动 commit 到 DAG
