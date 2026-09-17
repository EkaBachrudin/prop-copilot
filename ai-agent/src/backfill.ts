import { closePool, ensureVectorExtension, testConnection } from './shared/db';
import { reindex } from './rag/rag';
import { closeVectorStore } from './rag/vectorstore';

async function main(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    console.error('[backfill] database unreachable');
    process.exitCode = 1;
    return;
  }

  await ensureVectorExtension();
  const result = await reindex();
  console.log(
    `[backfill] listings embedded: ${result.listings}, document chunks embedded: ${result.documentChunks}`
  );
}

const command = process.argv[2] || 'run';

if (command === 'run') {
  main()
    .catch((error) => {
      console.error('[backfill] failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const storeClosed = await closeVectorStore();
      if (!storeClosed) await closePool();
      process.exit(process.exitCode ?? 0);
    });
} else {
  console.log('Usage: ts-node src/backfill.ts run');
}
