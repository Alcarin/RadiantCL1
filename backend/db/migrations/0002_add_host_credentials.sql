-- +goose Up
ALTER TABLE hosts ADD COLUMN username TEXT;
ALTER TABLE hosts ADD COLUMN password TEXT;

-- +goose Down
-- SQLite doesn't support DROP COLUMN easily in older versions, but for simplicity
-- we usually don't drop columns in sqlite during dev unless necessary.
-- If needed, we'd have to recreate the table.
