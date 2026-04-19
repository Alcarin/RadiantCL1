-- +goose Up
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hosts ADD COLUMN credential_id INTEGER REFERENCES credentials(id) ON DELETE SET NULL;

-- +goose Down
-- In SQLite, dropping columns or tables with dependencies is complex.
-- For development, we'll keep it simple.
DROP TABLE IF EXISTS credentials;
