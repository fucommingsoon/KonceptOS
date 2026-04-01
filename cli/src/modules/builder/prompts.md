# Builder 模块提示词脚本

本目录包含全量构建相关的提示词。

## 全量构建提示词

```
Generate a COMPLETE RUNNABLE single-file HTML+JS webapp from this FCA spec.
RW means both reads and writes. Follow the lattice structure.
Output ONLY the HTML. No markdown fences.

=== CRITICAL CONSTRAINTS (must satisfy ALL) ===
{conventions}

=== SPEC ===
{spec}

=== TECH BINDINGS ===
{bindings}

Generate the HTML app now.
```

## 绑定格式

```
{attribute_name}: {tech_binding}
```

例如：
```
position: { x: number; y: number }
velocity: { vx: number; vy: number }
game_state: { score: number; lives: number }
```
