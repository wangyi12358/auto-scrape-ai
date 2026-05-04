# 任务 05：DevTools 入口与空白面板

## 目标

在扩展中注册 **DevTools 页面**，在开发者工具中显示你的自定义 Panel（或最小 HTML），为任务 06 的 `chrome.devtools.network` 提供运行上下文。

## 范围

- WXT 配置 `devtools_page`（或等价 manifest 字段，以 WXT 文档为准）。
- DevTools 内加载的脚本可 `console.log` 自证已挂载。
- 可选：Panel 标题、图标占位。

## 不在此任务内

- 不订阅 `onRequestFinished`（任务 06）。
- 不与 Sidepanel 通信（任务 07）。

## 验收清单

- [ ] 打开任意页面的 DevTools，能看到你的 Panel / 页面。
- [ ] `manifest` 与 WXT 构建无报错，`wxt build` 可通过。

## 依赖

- [01-project-baseline.md](./01-project-baseline.md)

## 产出物

- `entrypoints/devtools.html`（或 WXT 推荐路径）+ 关联 TS 入口。
