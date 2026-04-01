# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-04-01

### CLI 重构 + 多文件构建 + 测试反馈

## [2.0.0] - 2026-04-01

### Added

#### CLI 重构
- 按照手册 v2.0 业务逻辑重构目录结构
- 新目录结构：`core/` (核心模块) + `modules/` (功能模块)
- 每个功能模块独立文件夹，包含 `index.js`、`README.md`、`prompts.md`

#### 功能模块
- **K-Editor**: add obj/attr, set, row, del, schema, convention
- **Viewer**: ctx, st, rw, flows, order, conflicts, groups, lat, concept, ts
- **DAG**: commit, goto, undo, dag, path, diff
- **Seed**: seed load/save/tree/conv/set
- **Refine**: resolve obj/attr, evolve
- **Impl**: impl, impls, impl show, ready, assemble, analyze
- **Builder**: build (全量构建)
- **FileOps**: save, open, export, compute
- **LLM**: llm analyze/ask/chat

#### 交互优化
- 所有修改状态的操作完成后自动输出 ctx 和状态摘要
- `seed load` 后自动显示种子信息和 ctx
- `llm analyze` 后自动显示状态

#### 文档
- 新增 `KonceptOS_v2_manual.md` (详细使用手册)
- 新增 `cli/Usage_Guide.md` (CLI 指令指南)

### Changed

- `package.json` 移至项目根目录
- CLI 入口改为 `cli/src/cli.js`
- 包名从 `konceptos-cli` 改为 `konceptos`

### Deprecated

- `cli/src/lib/` (旧代码，待删除)
- `cli/bin/` (旧入口，待删除)

---

## [0.9.1] - 2026-03-31

### Added
- 初始版本
- FCA 概念格计算
- LLM 集成
- 种子系统
