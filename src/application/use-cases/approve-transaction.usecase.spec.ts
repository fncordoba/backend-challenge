import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ApproveTransactionUseCase } from './approve-transaction.usecase';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
import { ITransactionRepository } from '../../domain/ports/transaction-repository.interface';
import { IOutboxRepository } from '../../domain/ports/outbox-repository.interface';
import { IDbConnection } from '../../shared/db/db-connection.interface';
import { ICache } from '../../shared/cache/cache.interface';
import { Transaction } from '../../domain/entities/transaction.entity';
import { User } from '../../domain/entities/user.entity';
import {
  TransactionNotFoundException,
  InvalidTransactionStateException,
  InsufficientFundsException,
} from '../../domain/exceptions/domain.exceptions';
import { QueryRunner } from 'typeorm';

describe('ApproveTransactionUseCase', () => {
  let useCase: ApproveTransactionUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let outboxRepository: jest.Mocked<IOutboxRepository>;
  let dbConnection: jest.Mocked<IDbConnection>;
  let cache: jest.Mocked<ICache>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(() => {
    queryRunner = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as any;

    userRepository = {
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    transactionRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;

    outboxRepository = {
      insert: jest.fn(),
      fetchPending: jest.fn(),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
    } as any;

    dbConnection = {
      createQueryRunner: jest.fn().mockResolvedValue(queryRunner),
    } as any;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    } as any;

    useCase = new ApproveTransactionUseCase(
      userRepository,
      transactionRepository,
      dbConnection,
      outboxRepository,
      cache,
    );
  });

  it('should throw error when transaction not found', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('tx-1')).rejects.toThrow(TransactionNotFoundException);
  });

  it('should throw error when transaction is not pending', async () => {
    const transaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      10000,
      'confirmed',
      new Date(),
    );
    transactionRepository.findById.mockResolvedValue(transaction);

    await expect(useCase.execute('tx-1')).rejects.toThrow(InvalidTransactionStateException);
  });

  it('should throw error for insufficient funds', async () => {
    const transaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      20000,
      'pending',
      new Date(),
    );
    const origin = new User('user-1', 'Juan', 'juan@test.com', 10000);
    const destination = new User('user-2', 'Maria', 'maria@test.com', 5000);

    transactionRepository.findById.mockResolvedValue(transaction);
    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(destination);

    await expect(useCase.execute('tx-1')).rejects.toThrow(InsufficientFundsException);
  });

  it('should approve pending transaction and update balances', async () => {
    const transaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      10000,
      'pending',
      new Date(),
    );
    const origin = new User('user-1', 'Juan', 'juan@test.com', 50000);
    const destination = new User('user-2', 'Maria', 'maria@test.com', 10000);

    transactionRepository.findById.mockResolvedValue(transaction);
    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(destination);
    const confirmedTransaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      10000,
      'confirmed',
      new Date(),
    );
    confirmedTransaction.updatedAt = new Date();
    transactionRepository.update.mockResolvedValue(confirmedTransaction);

    const result = await useCase.execute('tx-1');

    expect(result.status).toBe('confirmed');
    expect(userRepository.update).toHaveBeenCalledTimes(2);
    expect(transactionRepository.update).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });
});

