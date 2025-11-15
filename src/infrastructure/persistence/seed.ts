import { DataSource } from 'typeorm';
import { UserEntity } from './typeorm/entities/user.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'belo_user',
  password: process.env.DB_PASSWORD || 'belo_pass',
  database: process.env.DB_NAME || 'belo_db',
  entities: [UserEntity],
  synchronize: false,
  logging: false,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(UserEntity);

    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('Database already seeded');
      await AppDataSource.destroy();
      return;
    }

    const users = [
      {
        id: 'user-1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        balance: 100000,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-2',
        name: 'María García',
        email: 'maria@example.com',
        balance: 50000,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-3',
        name: 'Carlos López',
        email: 'carlos@example.com',
        balance: 75000,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await userRepository.save(users);
    console.log('Seed data created successfully');
    console.log('Users created:', users.map((u) => ({ id: u.id, name: u.name, balance: u.balance })));

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

