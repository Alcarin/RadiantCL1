-- +goose Up
CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    label TEXT NOT NULL,
    icon TEXT,
    is_expanded BOOLEAN NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER,
    label TEXT NOT NULL,
    icon TEXT,
    address TEXT NOT NULL,
    type TEXT NOT NULL, -- 'ssh' | 'telnet'
    port INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE hosts;
DROP TABLE folders;
