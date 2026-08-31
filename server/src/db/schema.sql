-- 家族族谱 SQLite schema v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_photo TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL DEFAULT 1 REFERENCES families(id),
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
  birth_date TEXT DEFAULT '',
  death_date TEXT DEFAULT '',
  parent_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  birth_order INTEGER DEFAULT 0,
  generation INTEGER DEFAULT 1,
  photo_url TEXT DEFAULT '',
  biography TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_deceased INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);

CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL DEFAULT 1 REFERENCES families(id),
  member_a_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_b_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'spouse' CHECK (relation_type IN ('spouse')),
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (member_a_id < member_b_id),
  UNIQUE (member_a_id, member_b_id, relation_type)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL DEFAULT 1 REFERENCES families(id),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('marriage', 'migration', 'ancestor_worship', 'birth', 'other')),
  event_date TEXT DEFAULT '',
  description TEXT DEFAULT '',
  related_member_ids TEXT DEFAULT '[]',
  image_urls TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL DEFAULT 1 REFERENCES families(id),
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  title TEXT DEFAULT '',
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  taken_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_member ON photos(member_id);
