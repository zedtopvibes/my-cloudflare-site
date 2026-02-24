-- Migration 001: Initial blog schema
-- Created: 2026-02-24

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    image_path TEXT,
    audio_path TEXT,
    date DATE DEFAULT CURRENT_DATE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT 0,
    views INTEGER DEFAULT 0
);

-- Create migrations table to track what's been run
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert this migration record
INSERT OR IGNORE INTO migrations (name) VALUES ('001_initial_schema.sql');