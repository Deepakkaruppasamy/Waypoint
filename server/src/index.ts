import { createApp } from './app';
import { config } from './config';
import { seedIfEmpty } from './seed';
import { createDataStore } from './storage';

async function main(): Promise<void> {
  const store = createDataStore();
  await store.connect();

  if (await seedIfEmpty(store)) {
    console.log('Empty database: added demo users and records.');
  }

  const server = createApp(store).listen(config.port, () => {
    console.log(`API ready on http://localhost:${config.port}/api  (storage: ${store.kind})`);
  });

  // Close connections cleanly when the process is stopped (Ctrl+C).
  const shutdown = () => {
    server.close(() => {
      store.close().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Could not start the API:', error instanceof Error ? error.message : error);
  process.exit(1);
});
