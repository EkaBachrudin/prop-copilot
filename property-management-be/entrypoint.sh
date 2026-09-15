#!/bin/bash
set -e

echo "Waiting for database at ${DB_HOST:-db}:${DB_PORT:-5432}..."

until node -e "
const net = require('net');
const socket = net.connect({ host: process.env.DB_HOST || 'db', port: parseInt(process.env.DB_PORT || '5432', 10) });
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
setTimeout(() => process.exit(1), 2000);
" 2>/dev/null; do
  echo "  Database is unavailable - retrying in 2s..."
  sleep 2
done

echo "Database is up."

echo "Running database migrations..."
npm run db:migrate

echo "Starting backend..."
exec "$@"
