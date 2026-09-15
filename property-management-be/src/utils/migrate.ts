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
