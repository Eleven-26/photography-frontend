# SLOT · 摄影师工作室后台管理（前端）

Vue 3 + TypeScript（组合式 API）+ Vite 构建的摄影师工作室后台管理界面，与 Go/Gin 后端（独立仓库 `photography-server`）前后端分离部署。**前端已移除全部演示数据，所有页面均依赖后端真实接口，后端未启动则页面报错而非展示假数据。**

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Vue 3.5（组合式 API，`<script setup>`） |
| 语言 | TypeScript ~5.6 |
| 构建 | Vite 6 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 4（HTML5 History 模式，路由级懒加载） |
| HTTP | Axios 1.7（统一封装 + RPC 风格调用） |
| 样式 | 手写设计系统 CSS（不引 UI 组件库） |
| 测试 | 暂无（见「测试与 CI」） |

## 快速开始

要求 Node.js ≥ 18（Docker 构建阶段使用 node:20-alpine）。

```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173（/api 代理到后端）
npm run typecheck    # vue-tsc --noEmit 类型检查
npm run build        # 产物输出到 dist/
npm run preview      # 本地预览构建产物
npm run lint         # eslint
npm run verify       # typecheck + lint
```

演示账号：`admin` / `admin123456`（仅本地联调；登录页的默认账号提示只在开发构建输出，生产包不渲染）。

开发模式下 `/api` 请求被 Vite 代理到 `VITE_API_BASE_URL`（默认 `http://localhost:8080`）并重写去掉 `/api` 前缀（后端路由位于根路径），见 `vite.config.ts`。

## 环境变量

| 文件 | 变量 | 说明 |
| --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | Vite 代理目标，默认 `http://localhost:8080` |
| `.env.production` | — | 已不再需要 `VITE_API_BASE_URL`：生产接口前缀由 `src/api/common/apiPath.ts` 的 `API_PREFIX`（`/api`）+ Nginx 反代决定 |

## 目录结构

```
src/
  api/            # 按业务域拆分的接口模块（17 个：auth/orders/leads/customers/finance/...）
    common/       # http.ts（axios 封装/拦截器/token）+ apiPath.ts（API_PATHS 单一来源）
  components/     # 通用组件（BaseModal / AppToast）
  composables/    # useFetch（统一数据获取）、useToast、useStudioSetting
  constants/      # 业务枚举（enums.ts）
  directives/     # v-perm 按钮级权限指令
  layouts/        # AppLayout 主布局（侧边栏 + 顶栏）
  router/         # 路由表、meta.perm 与登录守卫
  stores/         # Pinia（auth / app）
  styles/         # 设计系统 CSS（base/layout/components/forms/utilities）
  types/          # 与后端对齐的类型契约
  utils/          # 格式化工具
  views/          # 15 个视图（13 条业务路由 + 登录 + 403）
```

## 业务模块（页面）

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/dashboard` | 工作台 | 经营概览 |
| `/orders` | 订单管理 | 列表/创建/状态流转/取消/改期/收款退款 |
| `/custom-requests` | 定制需求 | H5 提交的定制需求响应 / 转订单 |
| `/leads` | 线索与报价 | 跟进、转化、报价 |
| `/calendar` | 日程与档期 | 档期锁定/释放、时段模板 |
| `/customers` | 客户管理 | 客户档案与统计 |
| `/delivery` | 选片与精修 | 交付看板（stage 1-4） |
| `/delivery/delivered` | 已交付 | 已交付归档（stage 5） |
| `/delivery/detail/:orderId` | 交付详情 | `:orderId` 为**订单 ID**（接口按订单反查交付单） |
| `/packages` | 套餐管理 | 上下架、编辑 |
| `/portfolio` | 作品集 | 作品维护与发布审核 |
| `/finance` | 财务与对账 | 收款核验、退款审批、汇总 |
| `/settings` | 工作室设置 | 员工/角色、收款方式、操作日志 |
| `/login` | 登录 | 公开页，未登录访问业务页自动跳转（携带 redirect） |
| `/403` | 无访问权限 | 权限不足兜底页 |

## 数据获取约定

- 统一走 `src/composables/useFetch.ts`：直接请求后端接口（RPC 风格），**失败即如实报错并清空数据**，不做任何演示数据回退。
- 这样可避免「接口挂了但页面还有上一轮的数」的假象，排障时错误一眼可见。
- `401/403` 由全局 HTTP 拦截器与路由守卫接管（跳登录 / 403 页），不在页面层处理。
- 生产包不携带任何 mock。

## 路由与权限

- 路由集中在 `src/router/index.ts`；`meta.perm` 标注进入该路由所需权限点（与后端 `internal/domain/perm.go` 对齐）。
- 全局 `beforeEach`：无 token → 登录页并携带 `redirect`；有 `meta.perm` → `auth.hasPerm` 校验，不通过 → `/403`。
- 按钮级权限用 `v-perm` 指令（`src/directives/`），菜单按权限过滤（`AppLayout.vue`）。
- 权限为 **fail-open**（用户信息未加载/无权限数据时放行），权限权威在后端强制鉴权。

## 后端 API 约定（对齐契约）

- **RPC 风格**：业务接口统一 `POST /api/{module}/{action}`（如 `POST /api/order/list`），部分支持 `/{id}` 追加；登录为 `POST /api/auth/login`。
- **路径单一来源**：所有端点集中定义在 `src/api/common/apiPath.ts` 的 `API_PATHS`，新增接口一律走 `API_PATHS + rpc()`，禁止散落字符串拼接。
- **统一响应**：`{ code: 0, msg, data }`，`code !== 0` 抛 `ApiError`。
- **分页响应**：`{ list, total, page, page_size }`（与后端 `response.Page` 对齐）。
- **主键位置**：create/update 走 body，detail/status/delete 走 URL 路径。
- **认证**：`Authorization: Bearer <token>`，token 存 `localStorage`（key `slot_token`）；401 由拦截器清除 token 并跳转 `/login`。
- 请求超时 15s，超时/网络异常有统一中文错误提示。

## 构建与部署（Docker）

- `Dockerfile`：多阶段构建 —— `node:20-alpine` 执行 `npm ci && npm run build` → `nginx:1.27-alpine` 托管 `dist/`。
- `build/nginx.conf`：gzip、`/assets/` 静态缓存 30 天、`/api/` 反向代理（重写去前缀后转发到 `backend:8080`）、SPA 回退 `index.html`。容器监听 80 端口。
- 镜像名 `chenkangfu/photography-frontend`，与后端编排（`photography-server/docker-compose.yml` 的 `frontend` 服务）一致。

```bash
npm run docker:build   # 构建并打标签 chenkangfu/photography-frontend:latest
```

> **本仓库不承担服务编排**：仅含前端镜像的 `Dockerfile` 与 Nginx 配置；容器编排统一在 `photography-server` 执行 `docker compose up -d --build`。

## 测试与 CI

- `npm run verify` = `typecheck + lint`；`npm test` = Vitest（当前覆盖 `src/utils/format.ts` 纯函数，9 个用例）。
- CI：`.github/workflows/ci.yml` 在 push/PR 执行 `npm ci → verify → test`。
- 后续可继续补 `composables/useFetch`、`stores/auth.hasPerm`、`api/common/http` 拦截器用例。

## 文档与原型

- `docs/prototype/`：SLOT PC 后台管理高保真可点击原型（其 HTML 已在 `.gitignore`，不入库）。
- `docs/api-refactor-review.md`：`src/` 目录分层与命名审视报告（**历史快照**：其中围绕 `src/api/demo.ts` 的结论已随该文件删除而失效）。

## 架构文档

跨仓架构基线维护在 `photography-server` 仓的 `docs/架构/`：
[目录地图](../photography-server/docs/架构/01-目录地图.md) · [系统架构图](../photography-server/docs/架构/02-系统架构图.md) · [结构审视与整改](../photography-server/docs/架构/03-结构审视与整改.md) · [面试要点](../photography-server/docs/架构/04-面试要点.md)。