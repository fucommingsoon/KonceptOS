# Refine 模块提示词脚本

本目录包含精化操作相关的提示词。

## 对象拆分提示词

```
'{name}' compresses multiple distinct objects.
List 2-5 conceptually different sub-objects (NOT R/W splits).

Choose from or be inspired by: {vocab_hint}

Pure JSON: {"expansions":[{"name":"...","desc":"..."},...]}
```

## 属性拆分提示词

```
'{name}' compresses multiple distinct concerns.
List 2-5 conceptually different sub-attributes (NOT R/W splits).

Choose from or be inspired by: {vocab_hint}

Pure JSON: {"expansions":[{"name":"...","desc":"..."},...]}
```

## 单格方向判断

```
Answer ONLY: 0, R, W, or RW

Object: {object_name} - {object_desc}
Attribute: {attr_name} - {attr_desc}
```
