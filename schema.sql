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

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Create post_tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER,
    tag_id INTEGER,
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Create index for faster queries
CREATE INDEX idx_posts_date ON posts(date);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_slug ON posts(slug);