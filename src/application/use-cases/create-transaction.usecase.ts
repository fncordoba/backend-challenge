import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
import { ITransactionRepository } from '../../domain/ports/transaction-repository.interface';
import { IOutboxRepository } from '../../domain/ports/outbox-repository.interface';
import { IDbConnection } from '../../shared/db/db-connection.interface';
import { ICache } from '../../shared/cache/cache.interface';
import {
  USER_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  OUTBOX_REPOSITORY_TOKEN,
  DB_CONNECTION_TOKEN,
  CACHE_TOKEN,
} from '../../shared/di/tokens';
import { Transaction, TransactionStatus } from '../../domain/entities/transaction.entity';
import {
  InsufficientFundsException,
  InvalidTransactionStateException,
  UserNotFoundException,
} from '../../domain/exceptions/domain.exceptions';
import { QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export interface CreateTransactionDTO {
  originId: string;
  destinationId: string;
  amount: number;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(DB_CONNECTION_TOKEN)
    private readonly dbConnection: IDbConnection,
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository?: IOutboxRepository,
    @Inject(CACHE_TOKEN)
    private readonly cache?: ICache,
  ) {}

  async execute(dto: CreateTransactionDTO): Promise<Transaction> {
    if (dto.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (dto.originId === dto.destinationId) {
      throw new InvalidTransactionStateException('Origin and destination cannot be the same');
    }

    const queryRunner = await this.dbConnection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const origin = await this.userRepository.findByIdForUpdate(
        dto.originId,
        queryRunner,
      );

      if (!origin) {
        throw new UserNotFoundException(dto.originId);
      }

      const destination = await this.userRepository.findById(dto.destinationId);

      if (!destination) {
        throw new UserNotFoundException(dto.destinationId);
      }

      if (!origin.hasSufficientBalance(dto.amount)) {
        throw new InsufficientFundsException();
      }

      const status: TransactionStatus = dto.amount > 50000 ? 'pending' : 'confirmed';

      const transaction = new Transaction(
        randomUUID(),
        dto.originId,
        dto.destinationId,
        dto.amount,
        status,
        new Date(),
      );

      const savedTransaction = await this.transactionRepository.create(
        transaction,
        queryRunner,
      );

      if (status === 'confirmed') {
        origin.debit(dto.amount);
        destination.credit(dto.amount);

        await this.userRepository.update(origin, queryRunner);
        await this.userRepository.update(destination, queryRunner);

        if (this.outboxRepository) {
          await this.outboxRepository.insert(
            {
              aggregateId: savedTransaction.id,
              type: 'transaction.confirmed',
              payload: JSON.stringify({
                id: savedTransaction.id,
                originId: savedTransaction.originId,
                destinationId: savedTransaction.destinationId,
                amount: savedTransaction.amount,
              }),
              status: 'pending',
            },
            queryRunner,
          );
        }
      } else {
        if (this.outboxRepository) {
          await this.outboxRepository.insert(
            {
              aggregateId: savedTransaction.id,
              type: 'transaction.pending',
              payload: JSON.stringify({
                id: savedTransaction.id,
                originId: savedTransaction.originId,
                destinationId: savedTransaction.destinationId,
                amount: savedTransaction.amount,
              }),
              status: 'pending',
            },
            queryRunner,
          );
        }
      }

      await queryRunner.commitTransaction();

      if (this.cache) {
        await this.cache.del(`user:${dto.originId}:txs`);
        await this.cache.del(`user:${dto.destinationId}:txs`);
        await this.cache.del(`user:${dto.originId}`);
        await this.cache.del(`user:${dto.destinationId}`);
      }

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

