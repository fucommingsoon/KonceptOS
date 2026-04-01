# KonceptOS v2.0 使用手册

## 安装与启动

```bash
# 设置 LLM API key
export OPENROUTER_API_KEY="sk-or-v1-..."

# 启动
python konceptos.py

# 带预加载状态启动
python konceptos.py --load saved_state.json
```

启动后进入交互式 REPL。提示符 `K[|G||RW]` 实时显示对象数量和剩余 RW 数量。`*` 标记表示有未提交的修改。

---

## 两条工作路径

### 路径一：全量构建（快速原型）

适合小项目或快速验证想法。整个 K 一次性发给 LLM 生成完整应用。

```
K[0|0]> llm analyze requirements.md     ← 提取 K₀
K[22|47]> resolve obj F13               ← 精化
K[25|42]> resolve attr D                ← 继续精化
K[28|38]> build game.html               ← 一次性生成
```

### 路径二：分步编程（推荐用于正式项目）

逐模块生成 impl，机械组装。编程反馈驱动 K 演化。

```
K[0|0]> llm analyze requirements.md     ← 提取 K₀
K[22|47]> resolve obj F13               ← 精化结构
K[25|42]> schema A { x: number; y: number }  ← 声明类型
K[25|42]> impl physics_engine           ← LLM 生成单模块
K[25|42]> impl renderer                 ← 逐个生成
K[25|42]> analyze physics_engine        ← 分析 RW 实际用法
K[25|42]> resolve attr D                ← 根据分析拆分
K[28|38]> ready                         ← 检查覆盖率
K[28|38]> assemble game.html            ← 机械组装（不调 LLM）
```

---

## 命令详解

### K 编辑

**`add obj <id> <name> [| desc]`** — 添加对象。新增的 I 值全部默认为 RW。

```
K[0|0]> add obj F01 physics_engine | handles motion and collision
```

**`add attr <id> <name> [| desc]`** — 添加属性。

```
K[3|0]> add attr A position | world coordinates
```

**`set <obj_id> <attr_id> <0|R|W|RW>`** — 精化单个 I 值。

```
K[3|12]> set F01 A W
```

W = 控制者（可读旧值 + 写新值）。R = 观察者（只读）。0 = 不涉及。RW = 方向待定。

**`row <obj_id> R,0,W,RW,...`** — 批量设置一行，按属性排序。

```
K[3|12]> row F01 W,R,0,RW
```

**`del obj|attr <id>`** — 删除对象或属性。

**`schema <attr_id> <type_definition>`** — 为属性声明类型。

```
K[3|8]> schema A { x: number; y: number }
```

**`convention [text]`** — 查看或设置约定。不带参数查看，带参数设置。

---

### 查看 K

**`ctx`** — 交叉表。核心视图，显示所有 I 值。

**`st`** — 状态摘要。显示三个停止条件的满足情况、一致性告警、时序冲突。

**`rw`** — 列出所有 RW 格子，按对象分组。

**`flows`** — 数据流图。从 I 矩阵推导的 W→R 关系。

**`order`** — 执行顺序。从 W→R 偏序拓扑排序的结果。

**`conflicts`** — 时序冲突检测。报告哪些对象需要拆分及原因。

**`groups`** — 编码分组。概念格推导的模块分组。

**`lat`** — 概念格层级结构。

**`concept <n>`** — 查看概念详情（intent 和 extent）。

**`ts`** — 生成 TypeScript 签名（Channels + Contracts）。

---

### DAG

**`commit [desc]`** — 将当前 K 快照为不可变 DAG 节点。自动计算 content-addressable hash。

```
K[28|38]> commit resolved physics attributes
  Committed: a3f8b2c10d4e
```

**`goto <hash>`** — 导航到任意 DAG 节点。支持前缀匹配。

```
K[28|38]> goto a3f8
  At a3f8b2c10d4e |G|=28 RW=38
```

**`undo`** — 返回父节点。如果有多个父节点，选择第一个。

**`dag`** — 显示 DAG 结构。`→` 标记当前节点。

**`path`** — 从根节点到当前节点的路径及每步操作描述。

**`diff <hash_a> <hash_b>`** — 对比两个 DAG 节点。显示 G/M 增删、RW 变化、I 值变化。

---

### 种子

**`seed`** — 查看当前种子信息。

**`seed load <file>`** — 加载种子 JSON。种子提供词表、分解树、方向提示、约定。

**`seed save <file>`** — 保存种子。

**`seed tree`** — 显示对象和属性的分解树。

**`seed conv`** — 显示种子约定。

**`seed set obj|attr <parent> <child1> <child2> ...`** — 手动添加分解规则。

---

### 精化

**`resolve obj|attr <id>`** — 拆分对象或属性。优先查种子的分解树，没有则询问 LLM。用户可选择接受(y)、拒绝(n)或编辑(edit)。

```
K[22|47]> resolve obj F13
  Seed: block_system → brick, question_block, hidden_block, empty_block
  Proceed? (y/n/edit) y
  Resolving...
  Done. RW=42 |G|=25 |B|=34  node=b7e2f1a09c3d
```

每次 resolve 自动 commit 到 DAG。

**`evolve [n|all]`** — 自动精化。找 RW 最多的对象，尝试拆分。`evolve 3` 做 3 轮，`evolve all` 做到 RW=0 或无法继续。

---

### Impl 与组装

**`impl <module_name> [comment]`** — 为指定模块生成 LLM 实现。

LLM 收到的信息（自动组装，用户不需要手动提供）：
- 模块名称和描述
- 契约（reads/writes/readwrites 通道列表）
- 涉及通道的 schema
- 相关 conventions
- 上游（谁写了我读的通道）和下游（谁读了我写的通道）
- 之前的 impl 和评论（如果有）

```
K[28|38]> impl physics_engine basic physics
  Generating...
  impl #0 (342 chars)
  function mod_physics_engine(state) { ...
```

**`impls [module_name]`** — 列出 impl。不带参数显示所有模块，带参数显示指定模块的 impl 列表。

**`impl show <module_name> <n>`** — 显示指定 impl 的完整代码。

**`ready`** — 显示 impl 覆盖率。✓ 表示有 impl，✗ 表示缺失。

```
K[28|38]> ready
  Impl coverage: 3/5 modules
  ✓ physics_engine (1 impl)
  ✓ renderer (2 impls)
  ✓ player_ctrl (1 impl)
  ✗ collision_detector
  ✗ score_display
```

**`assemble [output.html]`** — 从 K 结构和选定的 impl 机械组装可运行代码。不调用 LLM。

组装内容（全部从 K 机械生成或从 impl 拼接）：
1. Channels 类型定义（从 M schemas）
2. Contracts（从 I 矩阵）
3. Conventions（作为注释）
4. 模块实现（按拓扑序排列，每个模块取最新的 impl）
5. Game Loop（从 W→R 拓扑排序）
6. 启动代码

缺失 impl 的模块会生成空桩（`/* TODO */`）并在输出中告警。

**`analyze <module_name>`** — 分析 impl 代码中对 RW 通道的实际字段访问，建议拆分方案。

```
K[28|38]> analyze player
  RW usage analysis for player:
  Channel game_state (RW):
    read-only fields:  powerup → could be R
    write-only fields: score → could be W
  Suggestion: split these RW channels by field usage, then fork.
```

---

### 全量构建

**`build [output.html]`** — 将完整 K spec 发送给 LLM，一次性生成完整应用。适合小项目或快速验证。

---

### 文件操作

**`save <file>`** — 保存完整 DAG 状态（所有节点、边、impl）。

**`open <file>`** — 加载状态。自动检测 v2.0 DAG 格式或 v0.9 格式（自动转换）。

**`export <file.md>`** — 导出当前 K 为 Markdown spec 文档。

**`compute`** — 手动触发概念格重算。

---

## 典型工作流详解

### 第一个项目（无种子）

```
# 1. 从需求文档提取 K₀
llm analyze my_game_spec.md

# 2. 检查初始状态
st                              ← 看 RW 数量、一致性告警
ctx                             ← 看交叉表
rw                              ← 看哪些 RW 需要精化

# 3. 加载种子（如果有同领域种子）
seed load seed_2d_platformer.json

# 4. 精化 K（阶段一：纯结构）
resolve obj F13                 ← 拆对象
resolve attr D                  ← 拆属性
set F09 B R                     ← 手动修正方向
compute                         ← 重算概念格
st                              ← 检查进度

# 5. 声明 schema（阶段一到阶段二的转折）
schema A { x: number; y: number }
schema B { vx: number; vy: number }

# 6. 开始分步编程（阶段二：K 与编程交织）
impl physics_engine             ← 生成单模块
impl renderer
analyze physics_engine          ← 检查 RW 用法
resolve attr game_state         ← 根据分析拆分

# 7. 检查就绪状态
ready                           ← 看覆盖率
st                              ← 看三个停止条件
order                           ← 看执行顺序
conflicts                       ← 看时序冲突

# 8. 组装
assemble game.html              ← 机械组装

# 9. 测试，发现问题
# → 回到步骤 6，修改 K 或重新生成 impl

# 10. 提取种子给下一个项目
seed save my_domain_seed.json
```

### 第二个项目（有种子）

```
seed load my_domain_seed.json   ← 加载上个项目积累的种子
llm analyze new_game_spec.md    ← 种子引导 LLM 更精确

# 分解树自动匹配，方向提示自动应用
resolve obj F05                 ← 种子提供拆分方案，不调 LLM
resolve attr B                  ← 种子提供，zero LLM

# 只需手动处理领域特有的新内容
add attr element_type
impl new_mechanic_module

assemble game.html
```

---

## DAG 导航

```
# 查看 DAG 全貌
dag

# 查看从根到当前的路径
path

# 回退到父节点
undo

# 跳转到任意节点（前缀匹配）
goto a3f8

# 对比两个节点
diff a3f8 b7e2

# 走错了？回到更早的祖先，fork 新路径
goto a3f8                       ← 回到分叉前
resolve obj F05                 ← 换一种拆法
# 旧路径仍在 DAG 中，不受影响
```

---

## 三个停止条件

`st` 命令实时显示三个条件的满足状态：

```
  ✓ No RW (cond 1)              ← 所有 I 值已精化
  ✓ No temporal conflicts (cond 2)  ← 偏序图无矛盾
  Schemas: 12/12 (cond 3)       ← 所有活跃通道有 schema
```

三个条件都满足时，可以安全地分模块 build + assemble，TypeScript 编译器可作为证明检查器验证每个 impl。

三个条件不全满足时：
- 仍然可以 `build`（全量 LLM 生成）
- 仍然可以 `impl` + `assemble`（RW 通道当作完全访问，精度低但正确）
- 不建议分发或正式使用组装结果

---

# 潜在问题清单

## 已知局限

### 1. analyze 的正则匹配是启发式的

`analyze` 通过正则表达式匹配 impl 代码中的字段访问模式（如 `state.read('channel').field`）。它不做完整的 AST 分析。

**影响：** 可能遗漏某些读写模式，特别是通过变量间接访问的情况：

```javascript
const gs = state.read('game_state');
const field = 'score';
gs[field] = 10;  // analyze 检测不到这种动态访问
```

**缓解：** 将 analyze 的结果视为建议而非定论。人工审查 impl 代码后再决定是否拆分。长期目标是接入 TypeScript AST 分析器。

### 2. assemble 生成的胶水代码是最简模板

`assemble` 生成的 HTML 包含一个最基本的 ChannelStore（`state = {}`）和一个 `requestAnimationFrame` 循环。对于复杂项目可能不够：

- 没有真正的 `state.read()`/`state.write()` 访问控制（编译期的 TypeScript 检查在 JS 运行时不存在）
- 没有初始化流程（每个模块的初始状态怎么设置）
- 没有错误处理

**缓解：** assemble 的输出是起点，不是终点。可以手动编辑启动代码，或用 `build` 生成更完整的版本作为参考。

### 3. 时序冲突检测可能误报

`detect_temporal_conflicts` 基于传递闭包检测环。在中间粒度（大量 RW）时，RW 通道同时被当作 W 和 R 参与偏序构建，可能产生大量假环。

**缓解：** 先消解 RW（条件 1），再检测时序冲突（条件 2）。在 RW 较多时 `conflicts` 的输出可能不准确，这是正常的——先精化再检测。

### 4. 概念格计算在大规模 K 上可能慢

当前的概念格计算使用候选集枚举法，在 |G| > 50 或 |M| > 30 时可能明显变慢。

**缓解：** 概念格主要用于 `groups`（编码分组）和 `lat`（可视化）。其他功能（topo sort、consistency check、assemble）不依赖概念格。可以在必要时才手动 `compute`。

### 5. DAG 没有垃圾回收

每次 commit 都创建新节点，永不删除。长时间使用后 JSON 文件会变大。

**缓解：** 当前规模下（几十到几百个节点）不是问题。如果需要，可以手动编辑 JSON 删除不需要的旧节点。

### 6. 单文件 assemble 的规模限制

assemble 把所有模块拼入一个 HTML 文件。对于大型项目（100+ 模块），单文件可能过大或难以调试。

**缓解：** `assemble` 支持 `fmt='multi'` 参数（当前只在 API 层面，REPL 命令未暴露），可以扩展为生成多文件项目结构。概念格的 `coding_groups` 已经能推导文件分组。

### 7. LLM 生成的 impl 之间可能格式不一致

不同时间、不同 LLM 调用生成的 impl 可能对同一通道使用不同的访问模式（如一个用 `state.read('pos').x`，另一个用 `state.read('pos')[0]`）。assemble 机械拼接不会检测这种不一致。

**缓解：** 在 M 中声明足够精确的 schema。长期目标是通过 TypeScript 编译器验证每个 impl。在 impl 的 LLM 提示中已经包含了 schema 信息，大多数情况下 LLM 会遵守。

### 8. evolve 只拆对象不拆属性

`evolve` 自动模式只针对 RW 最多的对象做拆分。属性拆分需要手动 `resolve attr`。

**原因：** v0.5 的教训——自动属性拆分导致 M 爆炸（9→36，概念 52→322）。属性拆分需要更多领域判断。

**缓解：** 通过 `analyze` 获得 RW 拆分建议后手动执行 `resolve attr`。

### 9. 种子的子串匹配可能误触发

种子的 `suggest_split` 使用子串匹配（`if k in name or name in k`）。"enemy" 的分解规则可能匹配到 "enemy_spawner" 或 "anti_enemy_shield"。

**缓解：** resolve 前会显示种子建议并询问确认（y/n/edit），用户可以拒绝或编辑。全自动的 `evolve` 模式可能受此影响，建议对重要项目用手动模式。

## 可能遇到的用户困惑

### "为什么新加的格子全是 RW？"

这是设计意图。RW = top = "还没分析"。比 v0.9 的 `?` 更正确——RW 是一个合法的假说（"此模块可能涉及此通道"），后续精化为 R/W/0。

### "assemble 和 build 有什么区别？"

`build` = 把整个 K spec 发给 LLM，LLM 生成完整应用。一次 LLM 调用，结果是一个完整的程序。

`assemble` = 不调 LLM。把之前逐模块生成的 impl 加上从 K 机械生成的胶水代码拼在一起。前提是你已经用 `impl` 命令为每个模块生成了实现。

简单说：`build` 是一步到位，`assemble` 是拼积木。

### "impl 生成的代码不好怎么办？"

再生成一个。每个模块可以挂多个 impl，只增不删。`assemble` 默认用最新的 impl，但你可以通过 API 选择特定版本。

```
impl physics_engine try euler integration
impl physics_engine try verlet integration
impls physics_engine          ← 查看所有版本
impl show physics_engine 0    ← 查看第一版
impl show physics_engine 1    ← 查看第二版
```

### "commit 了但想撤销怎么办？"

不需要撤销。`undo` 回到父节点，从那里 fork 新路径。旧节点永远在 DAG 中。

### "RW 还剩很多，能不能直接 build/assemble？"

可以。RW 通道被当作"完全访问"（可读可写），类型检查仍然有效但精度低。对于快速原型完全可行。正式项目建议先精化到三个条件满足。

### "v0.9 的状态能不能导入？"

能。`open old_state.json` 自动检测 v0.9 格式并转换。`?` 值被转为 `RW`。

## 长期需要解决的问题

1. **TypeScript 编译验证** — 当前只生成签名文本，没有真正调用 tsc 验证 impl。需要集成 TypeScript 编译器或使用在线 API。

2. **多文件导出** — assemble 目前只支持单 HTML 文件。大型项目需要按概念格分组导出多文件。

3. **impl 选择器** — assemble 默认用最新 impl。需要一个交互式选择器让用户为每个模块选择版本。

4. **运行时 ChannelStore** — assemble 生成的 ChannelStore 是空壳。需要真正的运行时访问控制（至少在开发模式下）。

5. **种子生命周期** — 种子怎么从项目经验中自动提取、跨项目积累、分享。

6. **可视化** — 交叉表、概念格、DAG 的 Web 可视化。

7. **conventions 半形式化** — 把数值约束（如跳跃可达公式）从自然语言提升到可机械验证的表达式。
