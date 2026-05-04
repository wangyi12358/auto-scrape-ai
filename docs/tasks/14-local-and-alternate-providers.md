# 任务 14：本地与备用 Provider（Ollama / 自建网关）

## 目标

在任务 10 的 Provider 抽象上，增加 **Ollama**（或兼容 OpenAI 的本地网关）与可选 **自建反向代理**，降低 token 成本并满足内网合规。

## 范围

- Settings：`provider` 枚举、`baseURL`、`model` 按 provider 校验。
- Ollama：典型端口、路径、流式是否兼容 AI SDK 的说明与回退错误提示。
- 不在 UI 暴露完整内网 URL 到日志（可选调试开关）。

## 不在此任务内

- Chrome `window.ai`（若需支持，单开子任务或附录调研）。

## 验收清单

- [ ] 切换 Provider 后无需改代码即可调用（仅配置变更）。
- [ ] 连接失败时错误信息对用户可理解（非裸 stack）。
- [ ] 与任务 04 Options 字段联动。

## 依赖

- [10-ai-sdk-integration-streaming.md](./10-ai-sdk-integration-streaming.md)
- [04-options-page-and-storage.md](./04-options-page-and-storage.md)

## 产出物

- `lib/ai/providers/*` + Options 表单项扩展。
