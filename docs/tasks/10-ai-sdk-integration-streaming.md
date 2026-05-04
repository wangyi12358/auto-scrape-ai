# 任务 10：AI SDK 接入与流式输出

## 目标

在扩展内（或 **Background / Offscreen** — 以 Manifest 与 CORS 结论为准）集成 **Vercel AI SDK**，打通 `streamText`（或等价 API），并将 token 流暴露给 Sidepanel 消费。

## 范围

- 依赖安装与 `ts` 类型通过。
- Provider 抽象：`apiKey`、`baseURL`、`model` 从任务 04 settings 读取。
- 流式：chunk 聚合为「当前分析文本」；**取消**与**错误**（网络、429、空 key）有明确 UI 状态。
- **安全**：不在 repo 中硬编码 key；说明 key 存储位置与最小权限。

## 不在此任务内

- 不写完整业务 Prompt（任务 11）。
- 不实现 Ollama（任务 14）。

## 验收清单

- [ ] 使用占位 prompt 可看到流式文字出现在 Sidepanel（或临时面板）。
- [ ] 用户中止分析时，请求能取消且无泄漏。
- [ ] 文档中说明：若直连厂商 API 受限，可改为自建代理（与任务 14 呼应）。

## 依赖

- [02-domain-types-and-messages.md](./02-domain-types-and-messages.md)
- [08-sidepanel-shell-and-store.md](./08-sidepanel-shell-and-store.md)

## 产出物

- `lib/ai/client.ts` + 调用入口（background 或 sidepanel 之一，需论证）。
