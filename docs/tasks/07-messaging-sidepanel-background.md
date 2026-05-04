# 任务 07：跨上下文消息管道（DevTools / Background / Sidepanel）

## 目标

建立**稳定**的数据通道：DevTools 捕获 →（可选 Background 转发）→ Sidepanel 状态更新；并支持 Sidepanel 下发「开始/停止录制」等到 DevTools。

## 范围

- 优先使用 `runtime.connect` **长连接**（多事件、低延迟）；文档化 port 名称与重连策略。
- 若 Background 参与：说明原因（例如 DevTools 未打开时统一路由、或未来 offscreen）。
- 消息体严格使用任务 02 的类型；序列化注意 **大 payload**（必要时只传 id + 摘要，完整 body 走分块或 IndexedDB——高级项可标为后续优化）。

## 不在此任务内

- 不实现完整 Sidepanel UI（任务 08–09）。
- 不实现 AI 流式转发（任务 10 可与本任务衔接设计）。

## 验收清单

- [ ] DevTools 捕获一条请求后，Sidepanel 能收到并更新计数（可用临时文本验证）。
- [ ] Sidepanel 点击「开始/停止」能驱动 DevTools 侧监听开关。
- [ ] DevTools 关闭再打开时，行为有定义（丢弃 / 重连提示）。

## 依赖

- [02-domain-types-and-messages.md](./02-domain-types-and-messages.md)
- [06-network-capture-onrequestfinished.md](./06-network-capture-onrequestfinished.md)

## 产出物

- `lib/messaging/*` 或 `entrypoints/background.ts` 中的连接桥 + 类型安全的 handler 表。
