#!/usr/bin/env bash
# 从 tar.gz 恢复 data + uploads（覆盖前保留现场）
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.tar.gz>" >&2
  exit 1
fi

ARCHIVE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/data}"
UPLOAD_DIR="${UPLOAD_DIR:-$ROOT/uploads}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

echo "Stopping service is recommended: systemctl stop family-tree"

BROKEN_DATA="$DATA_DIR.broken-$STAMP"
BROKEN_UPLOAD="$UPLOAD_DIR.broken-$STAMP"
if [[ -d "$DATA_DIR" ]]; then
  mv "$DATA_DIR" "$BROKEN_DATA"
fi
if [[ -d "$UPLOAD_DIR" ]]; then
  mv "$UPLOAD_DIR" "$BROKEN_UPLOAD"
fi

TMP="$(mktemp -d)"
tar -xzf "$ARCHIVE" -C "$TMP"
mkdir -p "$DATA_DIR" "$UPLOAD_DIR"
cp -a "$TMP/family.db" "$DATA_DIR/family.db"
if [[ -d "$TMP/uploads" ]]; then
  cp -a "$TMP/uploads/." "$UPLOAD_DIR/"
fi
rm -rf "$TMP"

echo "Restored. Previous data kept at:"
echo "  $BROKEN_DATA"
echo "  $BROKEN_UPLOAD"
echo "Start service: systemctl start family-tree && curl -s localhost:3100/api/health"
