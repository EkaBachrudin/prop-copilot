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
