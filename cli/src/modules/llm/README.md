# LLM 模块

## 功能说明

大语言模型调用命令。

## 命令列表

| 命令 | 说明 |
|------|------|
| `llm analyze <file>` | 从文档提取 G、M、I |
| `llm ask` | 填充未知格子（交互式） |
| `llm chat <message>` | 通用对话 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `KONCEPTOS_API_KEY` | - | API 密钥 |
| `KONCEPTOS_MODEL` | `glm-5` | 模型名称 |
| `KONCEPTOS_URL` | bigmodel.cn | API 端点 |

## 使用示例

```bash
# 从需求文档提取
konceptos llm analyze requirements.md

# 交互式填充
konceptos llm ask

# 通用对话
konceptos llm chat "解释一下概念格"
```

## API Key 配置

```bash
export KONCEPTOS_API_KEY="your-api-key"
export KONCEPTOS_MODEL="glm-5"
export KONCEPTOS_URL="https://open.bigmodel.cn/api/paas/v4/chat/completions"
```
