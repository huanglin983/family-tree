# 家族族谱 H5

微信公众号菜单进入的移动端族谱：浏览世系、成员档案、大事记、相册；管理员本地登录维护；JSON/文件级备份。

## 目录

- `server/` — Express + SQLite API
- `web/` — Vue3 + Vant + vue3-tree-org
- `deploy/` — Nginx / systemd / 环境变量示例
- `docs/` — PRD、架构、部署与自测文档

文档：

- [PRD](docs/PRD-family-tree-v1.md)
- [架构](docs/ARCH-family-tree-v1.md)
- [部署与容灾](docs/DEPLOY-family-tree.md)
- [自测报告](docs/TEST-family-tree-v1.md)

## 本地开发

```bash
# 终端 1：API（默认 127.0.0.1:3100）
cd server
npm install
npm run dev

# 终端 2：前端（http://localhost:5173，代理 /api）
cd web
npm install
npm run dev
```

默认管理员：`admin` / `admin123`（上线务必修改）。

运行时数据默认在 **`E:\data`**（与代码仓分离）：

- `E:\data\family.db` — SQLite
- `E:\data\uploads\` — 上传图片

可用环境变量覆盖：`DATA_DIR`、`UPLOAD_DIR`，或整根目录 `FAMILY_TREE_DATA_ROOT`。

## 生产构建

```bash
cd web && npm ci && npm run build
cd ../server && npm ci && npm run build
```

详见 `docs/DEPLOY-family-tree.md`。
