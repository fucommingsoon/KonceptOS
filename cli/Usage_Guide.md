# KonceptOS CLI 使用指南

## 启动方式

```bash
node cli/src/cli.js [command]

# 或在项目根目录
node cli/src/cli.js --help
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `KONCEPTOS_API_KEY` | - | API 密钥（必填） |
| `KONCEPTOS_MODEL` | `glm-5` | 模型名称 |
| `KONCEPTOS_URL` | bigmodel.cn | API 端点 |

```bash
export KONCEPTOS_API_KEY="your-api-key"
export KONCEPTOS_MODEL="glm-5"
```

---

## 快速开始

```bash
# 1. 从需求文档提取 K₀
node cli/src/cli.js llm analyze requirements.md

# 2. 查看状态
node cli/src/cli.js st
node cli/src/cli.js ctx

# 3. 精化 K
node cli/src/cli.js resolve obj F01
node cli/src/cli.js resolve attr A

# 4. 全量构建
node cli/src/cli.js build game.html
```

---

## K 编辑

添加对象或属性：

```bash
# 添加对象
node cli/src/cli.js add obj F01 physics_engine | handles motion
node cli/src/cli.js add obj F02 renderer | draws to canvas

# 添加属性
node cli/src/cli.js add attr A position | world coordinates
node cli/src/cli.js add attr B velocity | movement vector
```

精化 I 值（对象与属性的关系）：

```bash
# 单格设置
node cli/src/cli.js set F01 A W      # F01 的 position 是写入
node cli/src/cli.js set F01 B R      # F01 的 velocity 是读取

# 批量设置（按属性顺序）
node cli/src/cli.js row F01 W,R,0,RW
```

删除：

```bash
node cli/src/cli.js del obj F01
node cli/src/cli.js del attr A
```

Schema 和约定：

```bash
# 声明类型
node cli/src/cli.js schema A "{ x: number; y: number }"

# 设置约定
node cli/src/cli.js convention "跳跃高度公式: h = v0^2 / 2g"
```

---

## 查看状态

```bash
node cli/src/cli.js ctx        # 交叉表
node cli/src/cli.js st         # 状态摘要
node cli/src/cli.js rw         # RW 格子
node cli/src/cli.js flows      # 数据流
node cli/src/cli.js order      # 执行顺序
node cli/src/cli.js conflicts   # 时序冲突
node cli/src/cli.js groups     # 编码分组
node cli/src/cli.js lat        # 概念格
node cli/src/cli.js concept 5  # 特定概念详情
node cli/src/cli.js ts         # TypeScript 签名
```

---

## 精化

```bash
# 拆分对象
node cli/src/cli.js resolve obj F01

# 拆分属性
node cli/src/cli.js resolve attr game_state

# 自动精化（1轮）
node cli/src/cli.js evolve

# 自动精化（3轮）
node cli/src/cli.js evolve 3

# 自动精化（直到完成）
node cli/src/cli.js evolve all
```

---

## 种子

```bash
# 查看当前种子
node cli/src/cli.js seed

# 加载种子
node cli/src/cli.js seed load examples/seed_2d_platformer.json

# 保存种子
node cli/src/cli.js seed save my_seed.json

# 查看分解树
node cli/src/cli.js seed tree

# 添加分解规则
node cli/src/cli.js seed set obj enemy enemy_spawner, enemy_health
```

---

## 分步编程

```bash
# 生成模块实现
node cli/src/cli.js impl physics_engine
node cli/src/cli.js impl renderer | 使用 canvas 2d

# 列出所有 impl
node cli/src/cli.js impls

# 查看特定 impl
node cli/src/cli.js impl show physics_engine 0

# 分析 RW 使用
node cli/src/cli.js analyze physics_engine

# 检查就绪状态
node cli/src/cli.js ready

# 组装
node cli/src/cli.js assemble game.html
```

---

## 全量构建

```bash
node cli/src/cli.js build game.html
```

---

## DAG 版本控制

```bash
# 提交快照
node cli/src/cli.js commit "resolved physics attributes"

# 查看 DAG
node cli/src/cli.js dag

# 跳转节点
node cli/src/cli.js goto a3f8

# 回退
node cli/src/cli.js undo

# 查看路径
node cli/src/cli.js path

# 对比两个版本
node cli/src/cli.js diff a3f8 b7e2
```

---

## 文件操作

```bash
# 保存到文件
node cli/src/cli.js save myproject.json

# 打开文件
node cli/src/cli.js open myproject.json

# 导出 Markdown
node cli/src/cli.js export spec.md

# 手动重算概念格
node cli/src/cli.js compute
```

---

## LLM 操作

```bash
# 从文档提取 G,M,I
node cli/src/cli.js llm analyze requirements.md

# 交互式填充未知格子
node cli/src/cli.js llm ask

# 通用对话
node cli/src/cli.js llm chat "解释一下什么是概念格"
```

---

## I 值说明

| 值 | 含义 |
|----|------|
| `0` | 不涉及 |
| `R` | 只读（观察者） |
| `W` | 只写（控制者） |
| `RW` | 读写（方向待定） |

---

## 典型工作流

### 路径一：全量构建（快速原型）

```bash
node cli/src/cli.js llm analyze requirements.md
node cli/src/cli.js build game.html
```

### 路径二：分步编程（正式项目）

```bash
# Phase 1: 提取并精化结构
node cli/src/cli.js llm analyze requirements.md
node cli/src/cli.js resolve obj F13
node cli/src/cli.js resolve attr game_state
node cli/src/cli.js schema A "{ x: number; y: number }"

# Phase 2: 分步生成 impl
node cli/src/cli.js impl physics_engine
node cli/src/cli.js impl renderer
node cli/src/cli.js analyze physics_engine

# Phase 3: 组装
node cli/src/cli.js ready
node cli/src/cli.js assemble game.html

# Phase 4: 提取种子供后续使用
node cli/src/cli.js seed save my_domain_seed.json
```

---

## 三停止条件

执行 `st` 时显示：

1. **No RW** - 所有 I 值已精化
2. **No temporal conflicts** - 偏序图无环
3. **Schemas complete** - 所有活跃通道有 schema

三条件全满足时可以安全地分模块 assemble。
