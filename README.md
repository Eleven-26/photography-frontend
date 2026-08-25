# SLOT · 摄影师工作室后台管理（前端）

Vue 3 + TypeScript（组合式 API）+ Vite 构建的摄影师工作室后台管理界面，与 Go/Gin 后端（`D:\www\photography`）前后端分离部署。

## 快速开始

```bash
npm install
npm run dev          # http://localhost:5173 （/api 代理到 http://localhost:8080）
npm run typecheck    # vue-tsc 类型检查
npm run build        # 产物输出到 dist/
```

演示账号：`13800002874` / `123456`

## 演示数据兜底

后端未启动时，页面通过 `src/composables/useFetch.ts` 自动回退到 `src/api/demo.ts` 的演示数据（页面顶部会显示来源提示）。连接后端后自动切换为实时数据。改期/退款审批、收款核验等写操作在后端未连接时返回演示成功。

## 项目结构

```
src/
  api/          # axios 封装 + 各模块 API + 演示数据
  components/   # BaseModal / AppToast 通用组件
  composables/  # useFetch（API/演示双数据源）、useToast
  layouts/      # AppLayout 主布局（侧边栏 + 顶栏）
  router/       # 路由与登录守卫
  stores/       # Pinia（auth / app）
  styles/       # 设计系统 CSS（由高保真原型移植）
  types/        # 与后端对齐的类型契约
  utils/        # 格式化工具
  views/        # 10 个业务视图
```

## Docker 部署（前后端分离）

- `Dockerfile`：Node 多阶段构建 → Nginx 托管静态资源
- `nginx.conf`：SPA 路由回退 + `/api` 反向代理到后端 `backend:8080`
- `docker-compose.yml`：`frontend`（Nginx，端口 8383）+ `backend`（Go API）两个容器

```bash
npm run docker:build   # 构建前端镜像 slot-admin-frontend
npm run docker:up      # docker compose up -d --build
```

前端容器对外端口为 `8383`，访问 `http://localhost:8383`。

## 原型文档

`docs/prototype/` 目录存放高保真可点击原型（SLOT_PC后台管理_高保真可点击原型.html），随项目一同部署，作为 UI 与交互的唯一参照。原型源文件最初来自：
`D:\AppData\xwechat_files\...\SLOT_PC后台管理_高保真可点击原型.html`

## 后端 API（对齐契约）

统一响应 `{ code: 0, message, data }`；分页 `{ total, page, page_size, items }`；认证 `Authorization: Bearer <token>`。接口详见 `src/api/*.ts`。
