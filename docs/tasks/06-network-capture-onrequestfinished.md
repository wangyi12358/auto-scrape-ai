# 任务 06：`onRequestFinished` 采集与初筛

## 目标

在 **DevTools 上下文** 订阅 `chrome.devtools.network.onRequestFinished`，将每条请求转为 `CapturedRequest`（含 response body 的获取策略），并用任务 03 的 **Filter** 做初筛后再外发。

## 范围

- 监听开始/停止与任务 08 的「录制」状态对齐（可先在本页用按钮模拟）。
- 从 `request` / `response` 对象组装 `CapturedRequest`（字段以任务 02 为准）。
- **异步 body**：`getContent` 回调错误处理（超时、非文本、过大提前放弃）。
- 初筛：未通过 Filter 的不进入下游消息（减少 IPC）。

## 不在此任务内

- 不在 Sidepanel 展示列表（任务 08–09）。
- 不做 Refiner（可在 DevTools 侧先调试用，正式管道在任务 07 后统一）。

## 验收清单

- [ ] 录制时能在 DevTools 控制台或临时 UI 看到捕获条数增长。
- [ ] 对静态资源（任务 03 排除规则）明显变少。
- [ ] 大响应不会卡死页面（需有上限或提前截断策略说明）。

## 依赖

- [03-filter-engine-and-refiner.md](./03-filter-engine-and-refiner.md)
- [05-devtools-entrypoint.md](./05-devtools-entrypoint.md)

## 产出物

- DevTools 内 `capture.ts`（或等价）+ 最小录制 UI。
