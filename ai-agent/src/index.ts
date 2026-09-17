import { createContainer } from './composition/container';
import { config } from './infrastructure/config';

const container = createContainer();

const start = async (): Promise<void> => {
  try {
    await container.startup();
  } catch (error) {
    console.error('[ai-agent] database unreachable, exiting', error);
    process.exit(1);
  }

  container.app.listen(config.port, () => {
    console.log(`[ai-agent] listening on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

void start();

process.on('SIGINT', async () => {
  await container.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await container.shutdown();
  process.exit(0);
});

export default container.app;
