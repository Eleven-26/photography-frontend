# 目录分层与命名审视报告

> 范围：`src/`（本次仅审视，除 apiPath/http 重构外未做额外改动）

## 现状

| 目录 | 内容 | 评价 |
| --- | --- | --- |
| `src/api` | 按业务域拆分的接口模块 + `common/`（http.ts、apiPath.ts） | ✅ 分层清晰，common 归置合理 |
| `src/api/demo.ts` | 纯 mock 演示数据，无任何硬编码 URL 或 http 引用 | ✅ 无问题 |
| `src/constants` | 业务枚举/常量 | ✅ |
| `src/types` | 领域模型类型 | ✅ |
| `src/stores` | Pinia 状态 | ✅ 未直接调 http 请求，仅引用 `tokenStore`（合规） |
| `src/composables` | useFetch 等 | ✅ 仅引用 `ApiError` 类型，未直接发请求 |
| `src/views` / `src/layouts` / `src/components` | 页面与组件 | ✅ 未见直接 import http 发请求的越层调用 |
| `src/router` / `src/utils` / `src/styles` | — | ✅ 正常 |

## 发现的问题与建议（未改动）

1. **`src/styles` 与 `src/components` 缺乏二级分类**：随组件增多建议按业务域/通用组件分目录（如 `components/common/`、`components/business/`），避免扁平化堆砌。
2. **`api/common` 命名**：现仅两文件，命名可接受；若日后新增 interceptor/auth-refresh 等可考虑改为 `api/core`，非必须。
3. **`demo.ts` 体量大（240+ 行）**：纯演示兜底数据与 api 层混在一起，建议后续迁至 `src/mocks/` 或 `src/demo/`，与真实 API 层解耦（本次未动，避免影响演示模式）。
4. **URL 前缀单一来源已落地**：本次重构后 `API_PREFIX` 唯一定义于 `apiPath.ts`，http.ts 与 auth.ts 均从此引用；建议后续新增接口一律走 `API_PATHS` + `rpc`，禁止再出现字符串拼接 URL。
5. **`package` 为 JS 保留字**：`API_PATHS['package']` 采用方括号访问规避 TS 解析歧义，属可接受的既定写法。

## 结论

整体分层（api / stores / composables / views / constants / types / utils）符合 Vue3 项目常见规范，无越层调用；问题集中在演示数据归置与组件目录细分，均属非阻塞优化项。
