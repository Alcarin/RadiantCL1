-- +goose Up
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserimento lingua predefinita
INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');

-- +goose Down
DROP TABLE IF EXISTS settings;
