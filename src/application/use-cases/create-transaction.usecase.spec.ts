import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from './create-transaction.usecase';
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
import { User } from '../../domain/entities/user.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { InsufficientFundsException, UserNotFoundException } from '../../domain/exceptions/domain.exceptions';
import { QueryRunner } from 'typeorm';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let dbConnection: jest.Mocked<IDbConnection>;
  let cache: jest.Mocked<ICache>;
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
        CreateTransactionUseCase,
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

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
    userRepository = module.get(USER_REPOSITORY_TOKEN);
    transactionRepository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    dbConnection = module.get(DB_CONNECTION_TOKEN);
    cache = module.get(CACHE_TOKEN);
  });

  it('should throw error for negative amount', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: -100 };

    await expect(useCase.execute(dto)).rejects.toThrow('Amount must be positive');
  });

  it('should throw error when origin user not found', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 1000 };
    userRepository.findByIdForUpdate.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(UserNotFoundException);
  });

  it('should throw error when destination user not found', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 1000 };
    const origin = new User('user-1', 'Juan', 'juan@test.com', 10000);
    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(UserNotFoundException);
  });

  it('should throw error for insufficient funds', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 20000 };
    const origin = new User('user-1', 'Juan', 'juan@test.com', 10000);
    const destination = new User('user-2', 'Maria', 'maria@test.com', 5000);
    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(destination);

    await expect(useCase.execute(dto)).rejects.toThrow(InsufficientFundsException);
  });

  it('should create confirmed transaction for amount <= 50000', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 10000 };
    const origin = new User('user-1', 'Juan', 'juan@test.com', 50000);
    const destination = new User('user-2', 'Maria', 'maria@test.com', 10000);
    const transaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      10000,
      'confirmed',
      new Date(),
    );

    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(destination);
    transactionRepository.create.mockResolvedValue(transaction);

    const result = await useCase.execute(dto);

    expect(result.status).toBe('confirmed');
    expect(userRepository.update).toHaveBeenCalledTimes(2);
    expect(transactionRepository.create).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should create pending transaction for amount > 50000', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 60000 };
    const origin = new User('user-1', 'Juan', 'juan@test.com', 100000);
    const destination = new User('user-2', 'Maria', 'maria@test.com', 10000);
    const transaction = new Transaction(
      'tx-1',
      'user-1',
      'user-2',
      60000,
      'pending',
      new Date(),
    );

    userRepository.findByIdForUpdate.mockResolvedValue(origin);
    userRepository.findById.mockResolvedValue(destination);
    transactionRepository.create.mockResolvedValue(transaction);

    const result = await useCase.execute(dto);

    expect(result.status).toBe('pending');
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(transactionRepository.create).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should rollback transaction on error', async () => {
    const dto = { originId: 'user-1', destinationId: 'user-2', amount: 10000 };
    userRepository.findByIdForUpdate.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(dto)).rejects.toThrow('DB error');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});

