import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { OutboxEntity } from './entities/outbox.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'belo_user',
  password: process.env.DB_PASSWORD || 'belo_pass',
  database: process.env.DB_NAME || 'belo_db',
  entities: [UserEntity, TransactionEntity, OutboxEntity],
  synchronize: false,
  logging: true,
  migrations: ['src/infrastructure/persistence/typeorm/migrations/*.ts'],
});

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();

