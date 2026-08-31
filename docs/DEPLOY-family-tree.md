# 部署与容灾手册：家族族谱 H5

> 对应架构：`docs/ARCH-family-tree-v1.md`  
> 示例配置：`deploy/`

---

## 1. 生产架构

```text
微信 / 浏览器 --HTTPS--> Nginx:443
                          ├── /          → web/dist (SPA)
                          ├── /uploads/  → UPLOAD_DIR
                          └── /api/      → 127.0.0.1:3100 (Express 单实例 + SQLite)
```

---

## 2. 环境要求

| 项 | 建议 |
|----|------|
| OS | Ubuntu 22.04+ / Debian 12+ |
| Node | 20 LTS |
| 进程用户 | `familytree`（非 root） |
| 证书 | Let's Encrypt 或云厂商 HTTPS |

---

## 3. 安装步骤

1. 创建用户与目录：

```bash
sudo useradd -r -s /usr/sbin/nologin familytree || true
sudo mkdir -p /opt/family-tree /var/lib/family-tree/{data,uploads,backups}
sudo chown -R familytree:familytree /var/lib/family-tree
```

2. 部署代码到 `/opt/family-tree`，配置环境：

```bash
sudo cp /opt/family-tree/deploy/env.example /etc/family-tree.env
sudo chmod 600 /etc/family-tree.env
# 编辑 SESSION_SECRET、ADMIN_PASS、CORS_ORIGIN、DATA_DIR、UPLOAD_DIR
```

3. 构建：

```bash
cd /opt/family-tree/web && npm ci && npm run build
cd /opt/family-tree/server && npm ci && npm run build
```

4. systemd：

```bash
sudo cp /opt/family-tree/deploy/family-tree.service.example /etc/systemd/system/family-tree.service
sudo systemctl daemon-reload
sudo systemctl enable --now family-tree
curl -s http://127.0.0.1:3100/api/health
```

5. Nginx：复制 `deploy/nginx.family-tree.conf.example`，改域名与证书路径，`nginx -t && systemctl reload nginx`。

6. 微信公众号后台：自定义菜单 URL 指向 `https://你的域名/`（按微信要求配置业务域名）。

---

## 4. 本地开发

见 `README.md`。默认账号 `admin` / `admin123`。

---

## 5. 备份（三级）

### L1 应用级

管理端「备份」页导出 JSON；导入前服务端自动写 `DATA_DIR/pre-import-*.json`。

### L2 主机定时

```bash
sudo chmod +x /opt/family-tree/server/scripts/*.sh
# crontab -e（familytree 用户或 root）
0 3 * * * DATA_DIR=/var/lib/family-tree/data UPLOAD_DIR=/var/lib/family-tree/uploads BACKUP_DIR=/var/lib/family-tree/backups /opt/family-tree/server/scripts/backup.sh
```

备份包：`family-tree-YYYYMMDD-HHMMSS.tar.gz`（含 `family.db`、`uploads/`、`MANIFEST.txt`）。

### L3 异地

将 `/var/lib/family-tree/backups/` 每日 `rsync` 到对象存储或另一台机器，保留 ≥30 天。

---

## 6. 恢复 Runbook

### 场景 A：同机回滚

```bash
sudo systemctl stop family-tree
sudo -u familytree /opt/family-tree/server/scripts/restore.sh /var/lib/family-tree/backups/family-tree-XXXX.tar.gz
sudo systemctl start family-tree
curl -s http://127.0.0.1:3100/api/health
# 抽查：首页、世系图、相册
```

### 场景 B：JSON 逻辑导入

管理端上传历史 JSON（覆盖前会自动 pre-import 快照）。照片实体需与 `uploads` 路径对齐。

### 场景 C：换机容灾

新机按第 3 节部署 → 恢复最新 L3 包 → 拷贝 `/etc/family-tree.env`（必要时轮换密钥）→ 切 DNS / 改微信菜单 → 冒烟登录、看树、上传一张图、再导出。

---

## 7. RPO / RTO（MVP）

| 指标 | 目标 |
|------|------|
| RPO | ≤ 24h（日备）；重大编辑后手动 L1 可逼近 0 |
| RTO | 同机 ≤ 1h；换机 ≤ 4h（含 DNS/菜单） |

---

## 8. 安全清单

- 仅 80/443 对公网；API 绑 `127.0.0.1`
- 强 `SESSION_SECRET`；上线改默认管理员密码
- 上传白名单 jpg/png/webp，限制体积
- 导入仅管理员；禁止把生产备份提交 git

---

## 9. 回滚应用版本

发布前打 git tag。回滚代码：检出上一 tag 重建 `web/dist` 与 `server/dist`，**不要**覆盖 `DATA_DIR`/`UPLOAD_DIR`（除非迁移破坏性变更且已备份）。

---

## 10. 微信 WebView 注意

- `viewport-fit=cover` 与安全区已在前端处理
- 构建 target 覆盖较旧 Chromium/iOS WebKit
- 转发依赖页面 `title` / `description`；本版不做 JS-SDK 定制分享
