# 任务 03：过滤引擎与 Refiner（纯函数）

## 目标

实现**与 Chrome API 无关**的管道：`CapturedRequest` + `ExtensionSettings` → 是否通过初筛 → `RefinedRequest`，并覆盖 Headers 黑名单、Body 长度、JSON 数组截断。

## 范围

### Filter Engine

- **Include domains**：支持正则；默认行为可与「当前域名」占位在任务 04/08 注入。
- **Exclude extensions**：如 `.jpg`、`.css`、`.woff2` 等，大小写不敏感。
- **Methods**：仅保留用户勾选的方法（常见 `GET` / `POST`）。

### Refiner

- 剔除 Headers：`Cookie`、`Sec-Ch-Ua*`、`Accept-Language` 等（可配置黑名单 + 合理默认）。
- **Response body**：按 `responseBodyLimit` 字符截断；注意 UTF-8 与性能（大字符串）。
- **JSON**：解析成功则对**顶层或任意层数组**做「只保留前 N 项」策略（与产品约定一致即可，需在注释中写清规则）；解析失败则退回纯文本截断。

## 不在此任务内

- 不从 DevTools 取原始 HAR（任务 06）。
- 不调用 AI（任务 10–11）。

## 验收清单

- [ ] 对 Filter / Refiner 写**单元测试**（Vitest 或 Node `assert`），覆盖：扩展名排除、方法过滤、JSON 数组截断、非法 JSON。
- [ ] 函数无副作用、无 `window` / `chrome` 依赖。
- [ ] 导出清晰的 API，例如：`passesFilter(req, settings)`、`refineRequest(req, settings)`。

## 依赖

- [02-domain-types-and-messages.md](./02-domain-types-and-messages.md)

## 产出物

- `lib/filter*.ts`、`lib/refine*.ts`（命名以仓库为准）+ `*.test.ts`。
