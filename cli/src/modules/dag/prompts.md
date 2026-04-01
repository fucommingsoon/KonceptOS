# DAG 模块提示词脚本

本目录包含 DAG 版本管理相关的提示词模板。

DAG 模块不直接调用 LLM，它是纯本地操作的版本控制系统。

## 涉及的核心概念

### Content-Addressable Hash
使用 SHA-1 哈希，内容变化时 hash 自动变化。

### Commit Message 建议

用户可以使用 LLM 生成 commit 消息：

```
Generate a concise commit message (under 50 chars) describing this change:

Objects added: {new_objs}
Objects removed: {removed_objs}
Attributes added: {new_attrs}
Attributes removed: {removed_attrs}
RW cells changed: {rw_changes}

Return only the commit message, no explanation.
```
