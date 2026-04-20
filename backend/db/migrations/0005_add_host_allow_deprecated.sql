-- +goose Up
-- +goose StatementBegin
ALTER TABLE hosts ADD COLUMN allow_deprecated BOOLEAN DEFAULT 0;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE hosts DROP COLUMN allow_deprecated;
-- +goose StatementEnd
