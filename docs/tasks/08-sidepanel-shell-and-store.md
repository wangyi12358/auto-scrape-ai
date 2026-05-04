# 任务 08：Sidepanel 壳层与全局 Store

## 目标

使用 WXT **Sidepanel** 作为主控制台：应用壳（布局槽位）、主题与基础路由；用 Jotai 管理**录制状态**、**请求列表**、**当前选中请求**、**设置缓存副本**。

## 范围

- `sidepanel` 入口、与 manifest 的 `side_panel` 配置。
- Store：`recording`、`requests[]`、`selectedId`、`settings`（从 storage 初始化，监听 `SETTINGS_UPDATED`）。
- 从任务 07 接入消息：追加/更新列表项、错误状态 `lastError`。

## 不在此任务内

- 不做右侧 Tab 内容（任务 09）。
- 不做 AI 流式渲染（任务 10–11）。

## 验收清单

- [ ] 从扩展图标可打开 Sidepanel，布局稳定（最小宽度可用）。
- [ ] 录制中与 DevTools 数据一致（列表条数、选中项不异常跳变）。
- [ ] Settings 变更后 Store 与后续 Refiner 使用一致（读最新 settings）。

## 依赖

- [04-options-page-and-storage.md](./04-options-page-and-storage.md)
- [07-messaging-sidepanel-background.md](./07-messaging-sidepanel-background.md)

## 产出物

- `entrypoints/sidepanel/*` + `lib/store/*`（或 `stores/`）。
