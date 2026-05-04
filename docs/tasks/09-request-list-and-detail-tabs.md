# 任务 09：请求列表与详情 Tab UI

## 目标

完成核心 **UX**：左侧请求列表（状态码、路径、类型）；右侧详情三 Tab — **接口文档**、**数据模型**（语法高亮 + 复制）、**模拟代码**（复制）。数据可先来自 Store 中的 `RefinedRequest` 预览或占位，AI 生成内容由任务 11 填入。

## 范围

- 列表：虚拟滚动（若条数多）、高亮选中、空状态与加载状态。
- Tab1–3 的容器与切换；代码块组件（可选用轻量高亮库或 `pre` + class）。
- **一键复制**与复制成功反馈。
- `TargetLanguage` / `SchemaType` 对 Tab2/3 的占位文案（真实内容由任务 11 写入 Store）。

## 不在此任务内

- 不实现完整流式 Markdown 渲染（任务 11 可逐步增强）。
- 不做全站聚合按钮逻辑（任务 12）。

## 验收清单

- [ ] 点击列表项，右侧切换且无控制台报错。
- [ ] 三 Tab 在窄屏下可用（或可滚动）。
- [ ] 复制按钮对当前 Tab 内容有效。

## 依赖

- [08-sidepanel-shell-and-store.md](./08-sidepanel-shell-and-store.md)
- [03-filter-engine-and-refiner.md](./03-filter-engine-and-refiner.md)（用于展示 refined 预览）

## 产出物

- `components/RequestList*`、`components/DetailPanel*`（路径可调整）。
