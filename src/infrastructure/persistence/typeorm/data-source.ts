import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { OutboxEntity } from './entities/outbox.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'belo_user',
  password: process.env.DB_PASSWORD || 'belo_pass',
  database: process.env.DB_NAME || 'belo_db',
  entities: [UserEntity, TransactionEntity, OutboxEntity],
  synchronize: false,
  logging: false,
  migrations: ['src/infrastructure/persistence/typeorm/migrations/*.ts'],
});

