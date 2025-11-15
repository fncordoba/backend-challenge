import { Injectable, Inject } from '@nestjs/common';
import { ITransactionRepository } from '../../domain/ports/transaction-repository.interface';
import { ICache } from '../../shared/cache/cache.interface';
import { TRANSACTION_REPOSITORY_TOKEN, CACHE_TOKEN } from '../../shared/di/tokens';
import { Transaction } from '../../domain/entities/transaction.entity';

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(CACHE_TOKEN)
    private readonly cache?: ICache,
  ) {}

  async execute(userId: string): Promise<Transaction[]> {
    if (this.cache) {
      const cached = await this.cache.get<Transaction[]>(`user:${userId}:txs`);
      if (cached) {
        return cached;
      }
    }

    const transactions = await this.transactionRepository.findByUserId(userId);

    const sorted = transactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    if (this.cache) {
      await this.cache.set(`user:${userId}:txs`, sorted, 60);
    }

    return sorted;
  }
}

