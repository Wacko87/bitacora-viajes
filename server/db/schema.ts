import { db } from './index.ts';

export function initDb() {
  console.log('[Database] Applying schema...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT UNIQUE NOT NULL, -- 'partner_1' | 'partner_2'
      pin_code TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#f59e0b',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      country_code TEXT NOT NULL,
      city TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'completed', -- 'active', 'completed', 'planned'
      summary TEXT,
      total_cost REAL,
      cost_currency TEXT DEFAULT 'EUR',
      inclusions TEXT,
      cost_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
      collector_profile_id TEXT REFERENCES profiles(id),
      category TEXT NOT NULL, -- 'coin', 'banknote', 'ticket', 'postcard', 'souvenir'
      title TEXT NOT NULL,
      currency_code TEXT,
      denomination TEXT,
      year INTEGER,
      image_front TEXT NOT NULL,
      image_back TEXT,
      story TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS trip_logs (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      day_number INTEGER,
      log_date DATE NOT NULL,
      title TEXT,
      notes_partner_1 TEXT,
      notes_partner_2 TEXT,
      photos TEXT, -- JSON array of image URLs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS trip_photos (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      thumb_url TEXT,
      caption TEXT,
      location TEXT,
      taken_at DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_trips_country ON trips(country_code);
    CREATE INDEX IF NOT EXISTS idx_artifacts_trip ON artifacts(trip_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_category ON artifacts(category);
    CREATE INDEX IF NOT EXISTS idx_artifacts_updated ON artifacts(updated_at);
    CREATE INDEX IF NOT EXISTS idx_logs_trip ON trip_logs(trip_id);
    CREATE INDEX IF NOT EXISTS idx_photos_trip ON trip_photos(trip_id);
  `);

  // Safe migrations for newly added columns on existing SQLite databases
  try {
    db.exec('ALTER TABLE trips ADD COLUMN total_cost REAL;');
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE trips ADD COLUMN cost_currency TEXT DEFAULT 'EUR';");
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE trips ADD COLUMN inclusions TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE trips ADD COLUMN cost_notes TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE trip_photos ADD COLUMN medium_url TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE trips ADD COLUMN temp_min REAL;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE trips ADD COLUMN temp_max REAL;');
  } catch {
    // Column already exists
  }

  // Seed default profiles if not present
  const profileCountStmt = db.prepare('SELECT COUNT(*) as count FROM profiles');
  const countRow = profileCountStmt.get() as { count: number };

  if (countRow.count === 0) {
    console.log('[Database] Seeding initial couple profiles...');
    const insertStmt = db.prepare(`
      INSERT INTO profiles (id, name, role, pin_code, avatar_color)
      VALUES (?, ?, ?, ?, ?)
    `);

    const partner1Name = process.env.DEFAULT_PARTNER_1_NAME || 'Viajero 1';
    const partner2Name = process.env.DEFAULT_PARTNER_2_NAME || 'Viajera 2';
    insertStmt.run('profile_1', partner1Name, 'partner_1', '1234', '#3b82f6');
    insertStmt.run('profile_2', partner2Name, 'partner_2', '1234', '#ec4899');
    console.log('[Database] Profiles initialized with default PIN: 1234');
  }
}
