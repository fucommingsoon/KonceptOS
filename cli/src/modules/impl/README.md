# Impl 模块

## 功能说明

模块实现生成与组装。

## 命令列表

| 命令 | 说明 |
|------|------|
| `impl <module_name> [comment]` | 为指定模块生成 LLM 实现 |
| `impls [module_name]` | 列出 impl（不带参数显示所有） |
| `impl show <module_name> <n>` | 显示指定 impl 的完整代码 |
| `ready` | 显示 impl 覆盖率 |
| `assemble [output.html]` | 从 K 结构和 impl 机械组装 |
| `analyze <module_name>` | 分析 impl 代码中对 RW 通道的实际字段访问 |

## impl

LLM 收到的信息：
- 模块名称和描述
- 契约（reads/writes/readwrites 通道列表）
- 涉及通道的 schema
- 相关 conventions
- 上游（谁写了我读的通道）和下游（谁读了我写的通道）
- 之前的 impl 和评论（如果有）

## ready

显示 impl 覆盖率：
```
Impl coverage: 3/5 modules
✓ physics_engine (1 impl)
✓ renderer (2 impls)
✗ collision_detector
✗ score_display
```

## assemble

从 K 结构和选定的 impl 机械组装可运行代码。

组装内容：
1. Channels 类型定义（从 M schemas）
2. Contracts（从 I 矩阵）
3. Conventions（作为注释）
4. 模块实现（按拓扑序排列，每个模块取最新的 impl）
5. Game Loop（从 W→R 拓扑排序）
6. 启动代码

缺失 impl 的模块会生成空桩并在输出中告警。

## analyze

分析 impl 代码中对 RW 通道的实际字段访问，建议拆分方案。

```
RW usage analysis for player:
Channel game_state (RW):
  read-only fields:  powerup → could be R
  write-only fields: score → could be W
Suggestion: split these RW channels by field usage
```
