# 02 — Database

The clone uses a single PostgreSQL database with **five tables**: `users`, `properties`,
`blocks`, `units`, and the migration bookkeeping table `schema_migrations`. All
schema changes are applied by the custom migration runner described in §4.

- Database engine: PostgreSQL 16 (PostgreSQL 13+ also works because `gen_random_uuid()` is built in).
- UUID primary keys.
- Timestamps are `TIMESTAMPTZ` with `NOW()` defaults.

---

## 1. Entity relationship diagram

```
users
  id (PK) ......... (no relationships in this clone)

properties
  id (PK)
  1 ────< blocks.property_id   (ON DELETE CASCADE)

blocks
  id (PK)
  property_id (FK → properties.id)
  1 ────< units.block_id       (ON DELETE CASCADE)

units
  id (PK)
  block_id (FK → blocks.id)
  status ∈ {available, reserved, booked, sold}

schema_migrations
  id (PK, serial)
  name, filename (unique), executed_at
```

Cardinality:

- one `property` → many `blocks`
- one `block` → many `units`
- deleting a property cascade-deletes its blocks and, in turn, their units.

---

## 2. Schema DDL

This is the content of `src/migrations/001_schema.sql`. It is idempotent
(`CREATE TABLE IF NOT EXISTS`) so re-running it is safe.

```sql
-- Migration: 001_schema
-- Description: Core schema for the Property Management application
-- Created: 2026-01-01
-- Database: PostgreSQL 13+

-- gen_random_uuid() is built into PostgreSQL 13+; pgcrypto keeps older servers working.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: users
-- Purpose: Application users (single user type, no roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- ============================================================================
-- Table: properties
-- Purpose: A property/cluster that contains blocks and units
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    land_area   NUMERIC(10, 2) CHECK (land_area IS NULL OR land_area >= 0),
    address     TEXT,
    description TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Table: blocks
-- Purpose: A block/section inside a property
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_block_name_per_property UNIQUE (property_id, name)
);

-- ============================================================================
-- Table: units
-- Purpose: A sellable unit inside a block
-- Note: status is managed manually via the API (no lead trigger in this clone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS units (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id   UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    land_area  NUMERIC(10, 2) CHECK (land_area IS NULL OR land_area >= 0),
    status     VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'reserved', 'booked', 'sold')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_unit_name_per_block UNIQUE (block_id, name)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active    ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_properties_name    ON properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_city    ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_active  ON properties(is_active);

CREATE INDEX IF NOT EXISTS idx_blocks_property_id ON blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_blocks_name        ON blocks(name);

CREATE INDEX IF NOT EXISTS idx_units_block_id     ON units(block_id);
CREATE INDEX IF NOT EXISTS idx_units_status       ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_name         ON units(name);
```

### 2.1 Constraint notes

| Constraint | Purpose | API error it backs |
| --- | --- | --- |
| `users.email UNIQUE` | one account per email | `409 EMAIL_ALREADY_EXISTS` |
| `valid_email` | basic format guard | `400 VALIDATION_ERROR` |
| `unique_block_name_per_property` | block names unique within a property | `409 CONFLICT` |
| `unique_unit_name_per_block` | unit names unique within a block | `409 CONFLICT` |
| `units.status CHECK` | only the four allowed statuses | `400 VALIDATION_ERROR` |
| FK `ON DELETE CASCADE` | property→blocks→units cleanup | — |

---

## 3. Seed data

### 3.1 Seed users (`002_seed_users.sql`)

One login account is created. The hash below is bcrypt for the plaintext `Admin123`
(the same hash used by the original project, verified to work with `bcryptjs`).

```sql
-- Migration: 002_seed_users
-- Description: Seed a default admin account
-- Password (plaintext): Admin123
-- ============================================================================

INSERT INTO users (full_name, email, phone, password_hash, is_active)
VALUES (
    'Admin User',
    'admin@example.com',
    '6281234567800',
    '$2y$10$950mf1eiKTv9Kd7dGiryYOBG6n/NXI8qaL7tSnaP109egLTywlEk6',
    true
) ON CONFLICT (email) DO NOTHING;
```

> **Credential:** `admin@example.com` / `Admin123`

> If you prefer to (re)generate the hash yourself, run the programmatic seeder in §4.5,
> which uses `bcryptjs` with 12 salt rounds and upserts the same account.

### 3.2 Seed properties (`003_seed_properties.sql`)

```sql
-- Migration: 003_seed_properties
-- Description: Seed sample properties
-- ============================================================================

INSERT INTO properties (name, city, land_area, address, description)
VALUES
    ('Brassia Garden', 'Bekasi', 4564.00, 'Jl. Brassia Raya No. 1, Bekasi', 'Cluster modern dengan akses tol'),
    ('Grand Permata Residence', 'Jakarta Selatan', 5000.00, 'Jl. Permata Raya No. 1, Jakarta Selatan', 'Cluster premium di Jakarta Selatan')
ON CONFLICT DO NOTHING;
```

### 3.3 Seed blocks (`004_seed_blocks.sql`)

Blocks reference properties by name so the SQL stays readable.

```sql
-- Migration: 004_seed_blocks
-- Description: Seed sample blocks
-- ============================================================================

INSERT INTO blocks (property_id, name)
SELECT p.id, b.name
FROM properties p
JOIN (VALUES
    ('Brassia Garden', 'Blok A'),
    ('Brassia Garden', 'Blok B'),
    ('Brassia Garden', 'Blok C'),
    ('Brassia Garden', 'Blok D'),
    ('Grand Permata Residence', 'Block Anggrek'),
    ('Grand Permata Residence', 'Block Mawar')
) AS b(property_name, name) ON b.property_name = p.name
ON CONFLICT (property_id, name) DO NOTHING;
```

### 3.4 Seed units (`005_seed_units.sql`)

Units are generated with `generate_series` and reference blocks by property + block name.

```sql
-- Migration: 005_seed_units
-- Description: Seed sample units (11 per block, mixed statuses on Blok A)
-- ============================================================================

-- Blok A (Brassia Garden): A1..A11 with a couple of non-available statuses
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id,
       'A' || s.i,
       84.00,
       CASE
           WHEN s.i = 3 THEN 'sold'
           WHEN s.i = 4 THEN 'reserved'
           WHEN s.i = 5 THEN 'booked'
           ELSE 'available'
       END
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 11) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok A'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok B (Brassia Garden): B1..B10
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'B' || s.i, 84.00 + s.i, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 10) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok B'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok C (Brassia Garden): C1..C16
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'C' || s.i, 84.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 16) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok C'
ON CONFLICT (block_id, name) DO NOTHING;

-- Blok D (Brassia Garden): D1..D11
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'D' || s.i, 82.00 + s.i, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 11) AS s(i) ON true
WHERE p.name = 'Brassia Garden' AND b.name = 'Blok D'
ON CONFLICT (block_id, name) DO NOTHING;

-- Grand Permata Residence: Block Anggrek A-1..A-8, Block Mawar B-1..B-8
INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'A-' || s.i, 72.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 8) AS s(i) ON true
WHERE p.name = 'Grand Permata Residence' AND b.name = 'Block Anggrek'
ON CONFLICT (block_id, name) DO NOTHING;

INSERT INTO units (block_id, name, land_area, status)
SELECT b.id, 'B-' || s.i, 90.00, 'available'
FROM blocks b
JOIN properties p ON p.id = b.property_id
JOIN generate_series(1, 8) AS s(i) ON true
WHERE p.name = 'Grand Permata Residence' AND b.name = 'Block Mawar'
ON CONFLICT (block_id, name) DO NOTHING;
```

After migrations, the database contains 2 properties, 6 blocks, and 74 units.

---

## 4. Migration runner

The API ships a small CLI (`src/utils/migrate.ts`) that:

1. Ensures `schema_migrations` exists.
2. Reads every `*.sql` in `src/migrations`, sorted **lexicographically** (the numeric
   `001_`, `002_`, … prefixes guarantee execution order).
3. Runs any file whose `filename` is not yet in `schema_migrations`, each inside its own
   transaction.
4. Records the migration with a name parsed from the `-- Migration: <name>` comment (or
   the filename).

### 4.1 `schema_migrations` table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 `src/utils/migrate.ts`

```ts
import { Pool } from 'pg';
import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: Date;
}

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

function getMigrationFiles(): string[] {
  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }
  return fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(MIGRATIONS_TABLE);
  console.log('✓ Migrations table ready');
}

async function getExecutedMigrations(pool: Pool): Promise<Map<string, Migration>> {
  const result = await pool.query<Migration>(
    'SELECT name, filename, executed_at FROM schema_migrations ORDER BY id'
  );
  const migrations = new Map<string, Migration>();
  result.rows.forEach((row) => migrations.set(row.filename, row));
  return migrations;
}

function readMigrationFile(filename: string): string {
  return fs.readFileSync(path.join(__dirname, '../migrations', filename), 'utf-8');
}

function extractMigrationName(sql: string, filename: string): string {
  const match = sql.match(/-- Migration: (.+)/);
  return match?.[1] || filename.replace('.sql', '');
}

async function executeMigration(pool: Pool, filename: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    const name = extractMigrationName(sql, filename);
    await client.query(
      'INSERT INTO schema_migrations (name, filename) VALUES ($1, $2)',
      [name, filename]
    );
    await client.query('COMMIT');
    console.log(`  ✓ Executed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Failed: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');
  try {
    await createMigrationsTable(pool);
    const files = getMigrationFiles();
    console.log(`Found ${files.length} migration file(s)\n`);
    if (files.length === 0) {
      console.log('No migrations to run.');
      return;
    }
    const executed = await getExecutedMigrations(pool);
    const pending = files.filter((file) => !executed.has(file));
    if (pending.length === 0) {
      console.log('Database is up to date. No pending migrations.');
      return;
    }
    console.log(`Running ${pending.length} pending migration(s):\n`);
    for (const file of pending) {
      await executeMigration(pool, file, readMigrationFile(file));
    }
    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function showMigrationStatus(): Promise<void> {
  console.log('Migration Status:\n');
  try {
    await createMigrationsTable(pool);
    const files = getMigrationFiles();
    const executed = await getExecutedMigrations(pool);
    console.log('Status:'.padEnd(12) + 'Migration File:');
    console.log('-'.repeat(50));
    for (const file of files) {
      const isDone = executed.has(file);
      const executedAt = executed.get(file)?.executed_at;
      console.log(
        `${(isDone ? 'Executed' : 'Pending').padEnd(12)} ${file.padEnd(30)} ${
          executedAt ? new Date(executedAt).toLocaleString() : ''
        }`
      );
    }
    const pendingCount = files.filter((f) => !executed.has(f)).length;
    console.log('-'.repeat(50));
    console.log(`Total: ${files.length} migrations, ${pendingCount} pending\n`);
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function rollbackMigration(): Promise<void> {
  console.log('Rolling back last migration...\n');
  try {
    await createMigrationsTable(pool);
    const result = await pool.query<Migration>(
      'SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }
    const last = result.rows[0];
    if (last) {
      console.log(`Rolling back: ${last.filename}`);
      console.log('\n⚠️  Automatic rollback is not implemented.');
      console.log('   Write and run the rollback SQL manually, then:');
      console.log(`   DELETE FROM schema_migrations WHERE filename = '${last.filename}';\n`);
    }
  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const command = process.argv[2] || 'run';
  switch (command) {
    case 'run':
      runMigrations().catch(() => process.exit(1));
      break;
    case 'status':
      showMigrationStatus().catch(() => process.exit(1));
      break;
    case 'rollback':
      rollbackMigration().catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: ts-node src/utils/migrate.ts [run|status|rollback]');
      process.exit(1);
  }
}
```

### 4.3 NPM scripts

```jsonc
// package.json (excerpt)
"db:migrate": "ts-node src/utils/migrate.ts run",
"db:migrate:status": "ts-node src/utils/migrate.ts status",
"db:migrate:rollback": "ts-node src/utils/migrate.ts rollback",
"db:migrate:prod": "node dist/utils/migrate.js run",
"db:migrate:status:prod": "node dist/utils/migrate.js status",
"db:seed": "ts-node src/utils/seed.ts"
```

### 4.4 Applying migrations

```bash
cd property-management-be
cp .env.example .env          # set DB_* and JWT_SECRET
npm install
npm run db:migrate            # runs 001..005
npm run db:migrate:status     # verify
```

### 4.5 Optional programmatic seeder — `src/utils/seed.ts`

Use this if you want to (re)generate the admin password hash with `bcryptjs` instead of
relying on the pre-hashed SQL value. It upserts the same account.

```ts
import { Pool } from 'pg';
import { hashPassword } from './auth/password';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'property_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const seedUsers = async () => {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding users...');
    const passwordHash = await hashPassword('Admin123');

    await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()`,
      ['Admin User', 'admin@example.com', '6281234567800', passwordHash]
    );

    console.log('🎉 Seed complete.');
    console.log('   admin@example.com / Admin123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedUsers };
```

---

## 5. Common queries

These are the exact queries used by the services (see `03-BACKEND.md` for the callers).

### 5.1 Properties list with block/unit counts

```sql
SELECT
  p.id, p.name, p.city, p.land_area, p.address, p.description,
  p.is_active, p.created_at, p.updated_at,
  COALESCE(bc.block_count, 0) AS total_blocks,
  COALESCE(uc.unit_count, 0)  AS total_units
FROM properties p
LEFT JOIN (
  SELECT property_id, COUNT(id) AS block_count
  FROM blocks
  WHERE is_active = true
  GROUP BY property_id
) bc ON bc.property_id = p.id
LEFT JOIN (
  SELECT b.property_id, COUNT(u.id) AS unit_count
  FROM blocks b
  JOIN units u ON u.block_id = b.id
  GROUP BY b.property_id
) uc ON uc.property_id = p.id
WHERE p.name ILIKE $1 OR p.city ILIKE $2   -- dynamic, only when filters present
ORDER BY p.name ASC
LIMIT $n OFFSET $m;
```

### 5.2 Property detail blocks with unit counts

```sql
SELECT
  b.id, b.name, b.is_active, b.created_at, b.updated_at,
  COALESCE(uc.unit_count, 0) AS total_units
FROM blocks b
LEFT JOIN (
  SELECT block_id, COUNT(id) AS unit_count
  FROM units
  GROUP BY block_id
) uc ON uc.block_id = b.id
WHERE b.property_id = $1
ORDER BY b.name ASC;
```

### 5.3 Units list (paginated, filtered)

```sql
-- count
SELECT COUNT(*) AS total
FROM units u
JOIN blocks b ON b.id = u.block_id
WHERE u.block_id = $1
  AND ($2::varchar IS NULL OR u.status = $2)
  AND ($3::text IS NULL OR u.name ILIKE '%' || $3 || '%');

-- rows
SELECT u.id, u.name, u.land_area, u.status, u.created_at, u.updated_at
FROM units u
JOIN blocks b ON b.id = u.block_id
WHERE u.block_id = $1
  AND ($2::varchar IS NULL OR u.status = $2)
  AND ($3::text IS NULL OR u.name ILIKE '%' || $3 || '%')
ORDER BY u.name ASC
LIMIT $4 OFFSET $5;
```

> The services use **natural sort** for unit names (so `A2 < A10`) via
> `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` in
> `src/utils/naturalSort.ts`. Because the sort is done in JS, the units query fetches the
> filtered rows and slices them in memory. For very large datasets, switch to a SQL
> `ORDER BY` with a numeric-aware collation.
