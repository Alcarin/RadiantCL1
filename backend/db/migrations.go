package db

import (
	"embed"
	"fmt"
	"log"

	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

// runMigrations executes the SQL migrations using goose.
func (m *Manager) runMigrations() error {
	goose.SetBaseFS(embedMigrations)

	if err := goose.SetDialect("sqlite3"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	dbPath, _ := GetDatabasePath()
	log.Printf("Applying migrations to: %s", dbPath)

	if err := goose.Up(m.DB, "migrations"); err != nil {
		return fmt.Errorf("failed to run goose migrations: %w", err)
	}

	return nil
}
