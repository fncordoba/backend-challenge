import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransactionsController } from './controllers/transactions.controller';
import { UsersController } from './controllers/users.controller';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.usecase';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { ApproveTransactionUseCase } from './application/use-cases/approve-transaction.usecase';
import { RejectTransactionUseCase } from './application/use-cases/reject-transaction.usecase';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.usecase';
import { UserRepository } from './infrastructure/persistence/typeorm/repositories/user.repository';
import { TransactionRepository } from './infrastructure/persistence/typeorm/repositories/transaction.repository';
import { OutboxRepository } from './infrastructure/persistence/typeorm/repositories/outbox.repository';
import { DbConnectionService } from './infrastructure/persistence/typeorm/db-connection.service';
import { RedisCacheService } from './infrastructure/cache/redis-cache.service';
import { UserEntity } from './infrastructure/persistence/typeorm/entities/user.entity';
import { TransactionEntity } from './infrastructure/persistence/typeorm/entities/transaction.entity';
import { OutboxEntity } from './infrastructure/persistence/typeorm/entities/outbox.entity';
import {
  USER_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  OUTBOX_REPOSITORY_TOKEN,
  DB_CONNECTION_TOKEN,
  CACHE_TOKEN,
} from './shared/di/tokens';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'belo_user',
      password: process.env.DB_PASSWORD || 'belo_pass',
      database: process.env.DB_NAME || 'belo_db',
      entities: [UserEntity, TransactionEntity, OutboxEntity],
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([UserEntity, TransactionEntity, OutboxEntity]),
  ],
  controllers: [TransactionsController, UsersController],
  providers: [
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: UserRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY_TOKEN,
      useClass: TransactionRepository,
    },
    {
      provide: OUTBOX_REPOSITORY_TOKEN,
      useClass: OutboxRepository,
    },
    {
      provide: DB_CONNECTION_TOKEN,
      useClass: DbConnectionService,
    },
    {
      provide: CACHE_TOKEN,
      useClass: RedisCacheService,
    },
    CreateTransactionUseCase,
    CreateUserUseCase,
    ApproveTransactionUseCase,
    RejectTransactionUseCase,
    ListTransactionsUseCase,
  ],
})
export class AppModule {}

