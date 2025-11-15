import { Injectable, Inject } from '@nestjs/common';
import { ITransactionRepository } from '../../domain/ports/transaction-repository.interface';
import { IOutboxRepository } from '../../domain/ports/outbox-repository.interface';
import { IDbConnection } from '../../shared/db/db-connection.interface';
import { ICache } from '../../shared/cache/cache.interface';
import {
  TRANSACTION_REPOSITORY_TOKEN,
  OUTBOX_REPOSITORY_TOKEN,
  DB_CONNECTION_TOKEN,
  CACHE_TOKEN,
} from '../../shared/di/tokens';
import { Transaction } from '../../domain/entities/transaction.entity';
import {
  TransactionNotFoundException,
  InvalidTransactionStateException,
} from '../../domain/exceptions/domain.exceptions';
import { QueryRunner } from 'typeorm';

@Injectable()
export class RejectTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(DB_CONNECTION_TOKEN)
    private readonly dbConnection: IDbConnection,
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly outboxRepository?: IOutboxRepository,
    @Inject(CACHE_TOKEN)
    private readonly cache?: ICache,
  ) {}

  async execute(transactionId: string): Promise<Transaction> {
    const queryRunner = await this.dbConnection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const transaction = await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new TransactionNotFoundException(transactionId);
      }

      if (!transaction.canBeRejected()) {
        throw new InvalidTransactionStateException(
          `Transaction ${transactionId} cannot be rejected. Current status: ${transaction.status}`,
        );
      }

      transaction.status = 'rejected';
      transaction.updatedAt = new Date();

      const updatedTransaction = await this.transactionRepository.update(
        transaction,
        queryRunner,
      );

      if (this.outboxRepository) {
        await this.outboxRepository.insert(
          {
            aggregateId: updatedTransaction.id,
            type: 'transaction.rejected',
            payload: JSON.stringify({
              id: updatedTransaction.id,
              originId: updatedTransaction.originId,
              destinationId: updatedTransaction.destinationId,
              amount: updatedTransaction.amount,
            }),
            status: 'pending',
          },
          queryRunner,
        );
      }

      await queryRunner.commitTransaction();

      if (this.cache) {
        await this.cache.del(`user:${transaction.originId}:txs`);
        await this.cache.del(`user:${transaction.destinationId}:txs`);
      }

      return updatedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

