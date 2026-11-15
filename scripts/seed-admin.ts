import 'reflect-metadata';
import * as argon2 from 'argon2';
import AppDataSource from '../src/database/data-source.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { UserRole, UserStatus } from '../src/shared/enums/index.js';

export async function seedAdmin() {
  console.log('--- Seeding Admin User ---');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(User);

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@exanova.edu';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@ExaNova2026!';

  const existingAdmin = await userRepo.findOne({
    where: [{ username: adminUsername }, { email: adminEmail }],
  });

  if (existingAdmin) {
    console.log(`Admin user [${adminUsername}] already exists. Skipping.`);
    return existingAdmin;
  }

  const hashedPassword = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  });

  const admin = userRepo.create({
    username: adminUsername,
    email: adminEmail,
    passwordHash: hashedPassword,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
  });

  const saved = await userRepo.save(admin);
  console.log(`Admin user [${adminUsername}] created successfully with ID: ${saved.id}`);
  return saved;
}

if (process.argv[1]?.endsWith('seed-admin.ts') || process.argv[1]?.endsWith('seed-admin.js')) {
  seedAdmin()
    .then(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error seeding admin:', err);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
