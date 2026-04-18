package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

type Manager struct {
	DB *sql.DB
}

// NewManager creates a new database manager and initializes the connection.
func NewManager() (*Manager, error) {
	dbPath, err := GetDatabasePath()
	if err != nil {
		return nil, fmt.Errorf("failed to get database path: %w", err)
	}

	// modernc.org/sqlite uses "sqlite" as the driver name
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable foreign key constraints
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	m := &Manager{DB: db}
	
	// Run migrations
	if err := m.Migrate(); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return m, nil
}

// Close closes the database connection.
func (m *Manager) Close() error {
	if m.DB != nil {
		return m.DB.Close()
	}
	return nil
}

// Migrate is defined in migrations.go but called here for initialization.
// This is just a placeholder to ensure the compiler is happy until we create migrations.go.
func (m *Manager) Migrate() error {
	log.Println("Running database migrations...")
	return m.runMigrations()
}
