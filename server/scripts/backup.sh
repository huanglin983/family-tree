#!/usr/bin/env bash
# L2 主机备份：SQLite + uploads + JSON 导出清单
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/data}"
UPLOAD_DIR="${UPLOAD_DIR:-$ROOT/uploads}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="$BACKUP_DIR/work-$STAMP"
OUT="$BACKUP_DIR/family-tree-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR" "$WORK"

DB="$DATA_DIR/family.db"
if [[ ! -f "$DB" ]]; then
  echo "DB not found: $DB" >&2
  exit 1
fi

# 在线备份，避免拷到半写入文件
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$WORK/family.db'"
else
  cp -a "$DB" "$WORK/family.db"
  [[ -f "$DB-wal" ]] && cp -a "$DB-wal" "$WORK/" || true
  [[ -f "$DB-shm" ]] && cp -a "$DB-shm" "$WORK/" || true
fi

if [[ -d "$UPLOAD_DIR" ]]; then
  mkdir -p "$WORK/uploads"
  cp -a "$UPLOAD_DIR/." "$WORK/uploads/" || true
fi

# 可选：若 API 在跑可用 curl 拉 JSON；否则跳过
EXPORT_URL="${EXPORT_URL:-}"
COOKIE_FILE="${COOKIE_FILE:-}"
if [[ -n "$EXPORT_URL" && -n "$COOKIE_FILE" ]]; then
  curl -fsS -b "$COOKIE_FILE" "$EXPORT_URL" -o "$WORK/export.json" || true
fi

{
  echo "stamp=$STAMP"
  echo "host=$(hostname)"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$WORK" && find . -type f -print0 | sort -z | xargs -0 sha256sum)
  fi
} > "$WORK/MANIFEST.txt"

tar -czf "$OUT" -C "$WORK" .
rm -rf "$WORK"

# 轮转
find "$BACKUP_DIR" -name 'family-tree-*.tar.gz' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

echo "Backup OK: $OUT"
