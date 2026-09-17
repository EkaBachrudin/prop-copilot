import { createContainer } from './composition/container';

const command = process.argv[2] || 'run';

if (command === 'run') {
  const container = createContainer();

  const main = async (): Promise<void> => {
    try {
      await container.startup();
    } catch (error) {
      console.error('[backfill] database unreachable', error);
      process.exitCode = 1;
      return;
    }

    const result = await container.rag.reindex();
    console.log(
      `[backfill] listings embedded: ${result.listings}, document chunks embedded: ${result.documentChunks}`
    );
  };

  main()
    .catch((error) => {
      console.error('[backfill] failed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await container.shutdown();
      process.exit(process.exitCode ?? 0);
    });
} else {
  console.log('Usage: ts-node src/backfill.ts run');
}
