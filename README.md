# SLOT · 摄影师工作室后台管理（前端）

Vue 3 + TypeScript（组合式 API）+ Vite 构建的摄影师工作室后台管理界面，与 Go/Gin 后端（独立仓库 `D:\www\photography`）前后端分离部署。后端未启动时前端可依托演示数据独立运行与演示。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Vue 3.5（组合式 API，`<script setup>`） |
| 语言 | TypeScript ~5.6 |
| 构建 | Vite 6 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 4（HTML5 History 模式，路由级懒加载） |
| HTTP | Axios 1.7（统一封装 + RPC 风格调用） |
| 测试 | 暂无 |

## 快速开始

要求 Node.js ≥ 18（Docker 构建阶段使用 node:20-alpine）。

```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173（/api 代理到后端）
npm run typecheck    # vue-tsc --noEmit 类型检查
npm run build        # 产物输出到 dist/
npm run preview      # 本地预览构建产物
```

演示账号：`admin` / `admin123456`

开发模式下 `/api` 请求被 Vite 代理到 `VITE_API_BASE_URL`（默认 `http://localhost:8080`），并重写去掉 `/api` 前缀（后端路由位于根路径），见 `vite.config.ts`。

## 环境变量

| 文件 | 变量 | 说明 |
| --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | Vite 代理目标，默认 `http://localhost:8080` |
| `.env.development` | `VITE_DEMO_USERNAME` / `VITE_DEMO_PASSWORD` | 登录页演示账号提示 |
| `.env.production` | `VITE_API_BASE_URL` | 生产为 `/api`，由 Nginx 反向代理转发，无需写死后端地址 |

## 演示模式（后端未启动可独立运行）

- 数据获取统一走 `src/composables/useFetch.ts`：优先请求后端 API，失败时自动回退到 `src/api/demo.ts` 的演示数据；`401/403` 不回退，交由全局拦截器跳转登录。
- 回退到演示数据时，页面顶部显示"演示数据（后端未连接）"来源提示。
- 演示模式下写操作（订单创建、退款审批、收款核验等）返回演示成功，便于完整走通交互流程。
- 连接后端后自动切换为实时数据，无需改代码。

## 目录结构

```
src/
  api/            # 按业务域拆分的接口模块（auth/orders/leads/customers/finance/...）
    common/       # http.ts（axios 封装/拦截器/token）+ apiPath.ts（API_PATHS 单一来源）
    demo.ts       # 演示兜底数据（字段与后端 Go 模型对齐）
  components/     # 通用组件（BaseModal / AppToast）
  composables/    # useFetch（API/演示双数据源）、useToast
  constants/      # 业务枚举（enums.ts）
  layouts/        # AppLayout 主布局（侧边栏 + 顶栏）
  router/         # 路由表与登录守卫
  stores/         # Pinia（auth / app）
  styles/         # 设计系统 CSS（由高保真原型移植：base/layout/components/forms/utilities）
  types/          # 与后端对齐的类型契约
  utils/          # 格式化工具
  views/          # 10 个业务视图 + 登录页
```

## 业务模块（页面）

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/dashboard` | 工作台 | 经营概览 |
| `/orders` | 订单管理 | 订单列表/创建/状态流转/取消 |
| `/leads` | 线索与报价 | 线索跟进、转化 |
| `/calendar` | 日程与档期 | 档期锁定/释放 |
| `/customers` | 客户管理 | 客户档案与统计 |
| `/delivery` | 选片与精修 | 交付管理 |
| `/packages` | 套餐管理 | 套餐上下架 |
| `/portfolio` | 作品集 | 作品维护 |
| `/finance` | 财务与对账 | 收款/退款/汇总，退款审批与收款核验 |
| `/settings` | 工作室设置 | 员工/角色、改密码 |
| `/login` | 登录 | 公开页，未登录访问业务页自动跳转（携带 redirect） |

## 后端 API 约定（对齐契约）

- **RPC 风格**：业务接口统一 `POST /api/{module}/{action}`（如 `POST /api/order/list`），部分支持 `/{id}` 追加；登录为 `POST /api/auth/login`。
- **路径单一来源**：所有端点集中定义在 `src/api/common/apiPath.ts` 的 `API_PATHS`，新增接口一律走 `API_PATHS + rpc()`，禁止散落字符串拼接。
- **统一响应**：`{ code: 0, msg, data }`，`code !== 0` 抛 `ApiError`。
- **分页响应**：`{ list, total, page, page_size }`（与后端 `response.Page` 对齐）。
- **认证**：`Authorization: Bearer <token>`，token 存 `localStorage`（key `slot_token`）；响应拦截器遇到 `401` 自动清除 token 并跳转 `/login?redirect=...`。
- 请求超时 15s，超时/网络异常有统一中文错误提示。

## 构建与部署（Docker）

- `Dockerfile`：多阶段构建 —— `node:20-alpine` 执行 `npm ci && npm run build` → `nginx:1.27-alpine` 托管 `dist/`。
- `deploy/nginx.conf`：gzip 压缩、`/assets/` 静态资源缓存 30 天、`/api/` 反向代理（重写去前缀后转发到 `backend:8080`）、SPA 路由回退到 `index.html`。容器监听 80 端口。

```bash
npm run docker:build   # 构建前端镜像 slot-admin-frontend:latest
```

> 注意：本仓库仅包含前端镜像的 `Dockerfile` 与 Nginx 配置，**未包含 docker-compose.yml**。`npm run docker:up` / `docker:down` 脚本需要 compose 编排文件（与后端 `backend` 服务联编联启），该编排由部署方或后端仓库提供。

## 文档与原型

- `docs/prototype/`：SLOT PC 后台管理高保真可点击原型，UI 与交互的唯一参照（已加入 `.gitignore`，不入库）。
- `docs/api-refactor-review.md`：`src/` 目录分层与命名审视报告。
