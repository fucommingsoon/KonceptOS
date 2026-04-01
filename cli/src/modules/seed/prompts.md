# Seed 模块提示词脚本

本目录包含种子管理和提取相关的提示词。

## 种子提取提示词

从成功的项目中提取种子：

```
Analyze this completed KonceptOS project and extract a reusable seed:

Completed K:
- Objects: {objects}
- Attributes: {attributes}
- Conventions: {conventions}

Extract:
1. obj_vocab: Key object categories (L1)
2. attr_vocab: Key attribute categories (L1)
3. obj_tree: Common object decomposition patterns
4. attr_tree: Common attribute decomposition patterns
5. incidence_hints: Typical R/W patterns for each attribute type
6. conventions: Reusable constraint rules

Return JSON seed structure.
```
