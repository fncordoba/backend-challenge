import { Test, TestingModule } from '@nestjs/testing';
import { ApproveTransactionUseCase } from './approve-transaction.usecase';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
import { ITransactionRepository } from '../../domain/ports/transaction-repository.interface';
import { IDbConnection } from '../../shared/db/db-connection.interface';
import { ICache } from '../../shared/cache/cache.interface';
import {
  USER_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  DB_CONNECTION_TOKEN,
  CACHE_TOKEN,
} from '../../shared/di/tokens';
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
  let dbConnection: jest.Mocked<IDbConnection>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    queryRunner = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveTransactionUseCase,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: {
            findById: jest.fn(),
            findByIdForUpdate: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: DB_CONNECTION_TOKEN,
          useValue: {
            createQueryRunner: jest.fn().mockResolvedValue(queryRunner),
          },
        },
        {
          provide: CACHE_TOKEN,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ApproveTransactionUseCase>(ApproveTransactionUseCase);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    transactionRepository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    dbConnection = module.get(DB_CONNECTION_TOKEN);
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

