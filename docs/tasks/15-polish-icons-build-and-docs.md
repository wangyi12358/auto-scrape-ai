# 任务 15：图标、构建、多浏览器与简短文档

## 目标

达到可分发状态：图标与商店素材占位、**Firefox / Chromium** 构建验证、`README` 使用说明（安装、打开 DevTools、打开 Sidepanel、配置 Key）。

## 范围

- `wxt build` / `zip`；`dev:firefox` 冒烟（Sidepanel + DevTools API 差异在 README 中注明）。
- 图标多尺寸、浅色/深色（按 WXT 约定路径）。
- README：隐私声明（捕获数据、是否上传云端）、最小权限说明。

## 不在此任务内

- 商店上架文案与截图全流程（可附录 checklist）。

## 验收清单

- [ ] 新克隆仓库按 README 可跑通 `dev` 与 `build`。
- [ ] 主要平台至少其一（Chromium 或 Firefox）完整走通录制 → 分析 → 持久化。
- [ ] `manifest` 权限与 README 描述一致。

## 依赖

- [13-persist-capture-and-analysis.md](./13-persist-capture-and-analysis.md)（及之前所有核心任务）

## 产出物

- `README.md` 更新、`assets/` 图标、可选 `docs/privacy.md`。
