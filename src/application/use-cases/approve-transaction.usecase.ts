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
import { Transaction } from '../../domain/entities/transaction.entity';
import {
  TransactionNotFoundException,
  InvalidTransactionStateException,
  InsufficientFundsException,
} from '../../domain/exceptions/domain.exceptions';

@Injectable()
export class ApproveTransactionUseCase {
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

  async execute(transactionId: string): Promise<Transaction> {
    const queryRunner = await this.dbConnection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const transaction = await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new TransactionNotFoundException(transactionId);
      }

      if (!transaction.canBeApproved()) {
        throw new InvalidTransactionStateException(
          `Transaction ${transactionId} cannot be approved. Current status: ${transaction.status}`,
        );
      }

      const origin = await this.userRepository.findByIdForUpdate(
        transaction.originId,
        queryRunner,
      );

      if (!origin) {
        throw new Error(`Origin user ${transaction.originId} not found`);
      }

      if (!origin.hasSufficientBalance(transaction.amount)) {
        throw new InsufficientFundsException();
      }

      const destination = await this.userRepository.findById(transaction.destinationId);

      if (!destination) {
        throw new Error(`Destination user ${transaction.destinationId} not found`);
      }

      origin.debit(transaction.amount);
      destination.credit(transaction.amount);

      await this.userRepository.update(origin, queryRunner);
      await this.userRepository.update(destination, queryRunner);

      transaction.status = 'confirmed';
      transaction.updatedAt = new Date();

      const updatedTransaction = await this.transactionRepository.update(
        transaction,
        queryRunner,
      );

      if (this.outboxRepository) {
        await this.outboxRepository.insert(
          {
            aggregateId: updatedTransaction.id,
            type: 'transaction.confirmed',
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
        await this.cache.del(`user:${transaction.originId}`);
        await this.cache.del(`user:${transaction.destinationId}`);
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

