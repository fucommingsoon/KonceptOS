# K-Editor 模块

## 功能说明

K 编辑命令，用于修改 KonceptOS 的核心状态（对象 G、属性 M、关联矩阵 I）。

## 命令列表

| 命令 | 说明 |
|------|------|
| `add obj <id> <name> [desc]` | 添加对象 |
| `add attr <id> <name> [desc]` | 添加属性 |
| `set <obj_id> <attr_id> <0\|R\|W\|RW>` | 精化单个 I 值 |
| `row <obj_id> R,0,W,RW,...` | 批量设置一行 |
| `del obj\|attr <id>` | 删除对象或属性 |
| `schema <attr_id> <type_definition>` | 声明属性类型 |
| `convention [text]` | 查看或设置约定 |

## I 值说明

- **0**: 不涉及（无关联）
- **R**: 观察者（只读）
- **W**: 控制者（可写）
- **RW**: 读写者（方向待定）

## 使用示例

```bash
# 添加对象
konceptos add obj F01 physics_engine | handles motion and collision

# 添加属性
konceptos add attr A position | world coordinates

# 精化 I 值
konceptos set F01 A W

# 批量设置
konceptos row F01 W,R,0,RW

# 声明类型
konceptos schema A { x: number; y: number }

# 设置约定
konceptos convention "跳跃高度公式: h = v0^2 / 2g"
```
