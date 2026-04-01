# Seed 模块

## 功能说明

种子管理，提供领域知识的复用和引导。

## 命令列表

| 命令 | 说明 |
|------|------|
| `seed` | 查看当前种子信息 |
| `seed load <file>` | 加载种子 JSON |
| `seed save <file>` | 保存种子 |
| `seed tree` | 显示对象和属性的分解树 |
| `seed conv` | 显示种子约定 |
| `seed set obj\|attr <parent> <child1> <child2> ...` | 手动添加分解规则 |

## 种子结构

- **domain**: 领域名称
- **obj_vocab**: L1 对象词表
- **attr_vocab**: L1 属性词表
- **obj_tree**: L2 对象分解树
- **attr_tree**: L2 属性分解树
- **incidence_hints**: L2 方向提示
- **conventions**: L2 约定规则
- **reference_k**: L3 参考 K*

## 使用示例

```bash
# 加载种子
konceptos seed load 2d_platformer_seed.json

# 查看种子信息
konceptos seed

# 查看分解树
konceptos seed tree

# 添加自定义分解规则
konceptos seed set obj enemy enemy_spawner, enemy_movement, enemy_health
```

## 子串匹配说明

种子的 `suggest_split` 使用子串匹配。可能匹配到意外的结果：
- "enemy" 可能匹配 "enemy_spawner" 或 "anti_enemy_shield"
- resolve 前会显示种子建议并询问确认（y/n/edit）
