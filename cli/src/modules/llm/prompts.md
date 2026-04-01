# LLM 模块提示词脚本

本目录包含 LLM 调用相关的提示词模板。

## 提取 G, M, I

```
Extract OBJECTS and ATTRIBUTES from the document.
ATTRIBUTES = high-level concern dimensions (~6-12).
Return JSON with format:
{"objects":[{"id":"F01","name":"...","desc":"..."}],"attributes":[{"id":"A","name":"...","desc":"..."}]}
```

## 填充方向矩阵

```
For each (object,attribute) determine: 0/R/W/RW.
0 = not involved, R = read-only, W = write-only, RW = read-write.
Per object: comma-separated values in attribute order.
Return JSON: {"F01":"R,0,W,RW,...",...}
```

## 通用对话

```
FCA assistant. Answer questions about Formal Concept Analysis, lattice structures, and the KonceptOS methodology.
```
