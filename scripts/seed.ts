import { seedDemo } from './seed-demo.js';
import AppDataSource from '../src/database/data-source.js';

seedDemo()
  .then(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Seeding failed:', err);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
