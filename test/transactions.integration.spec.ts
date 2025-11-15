import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppDataSource } from '../src/infrastructure/persistence/typeorm/data-source';
import { UserEntity } from '../src/infrastructure/persistence/typeorm/entities/user.entity';
import { TransactionEntity } from '../src/infrastructure/persistence/typeorm/entities/transaction.entity';

describe('Transactions Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await AppDataSource.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await AppDataSource.getRepository(TransactionEntity).delete({});
    await AppDataSource.getRepository(UserEntity).delete({});
    await AppDataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(TransactionEntity).delete({});
    const userRepo = AppDataSource.getRepository(UserEntity);
    await userRepo.delete({});
    await userRepo.save([
      {
        id: 'user-1',
        name: 'Test User 1',
        email: 'test1@test.com',
        balance: 100000,
        version: 0,
      },
      {
        id: 'user-2',
        name: 'Test User 2',
        email: 'test2@test.com',
        balance: 50000,
        version: 0,
      },
    ]);
  });

  it('/transactions (POST) - should create confirmed transaction for amount <= 50k', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .send({
        originId: 'user-1',
        destinationId: 'user-2',
        amount: 10000,
      })
      .expect(201);

    expect(response.body.status).toBe('confirmed');

    const userRepo = AppDataSource.getRepository(UserEntity);
    const origin = await userRepo.findOne({ where: { id: 'user-1' } });
    const destination = await userRepo.findOne({ where: { id: 'user-2' } });

    expect(parseFloat(origin.balance.toString())).toBe(90000);
    expect(parseFloat(destination.balance.toString())).toBe(60000);
  });

  it('/transactions (POST) - should create pending transaction for amount > 50k', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions')
      .send({
        originId: 'user-1',
        destinationId: 'user-2',
        amount: 60000,
      })
      .expect(201);

    expect(response.body.status).toBe('pending');

    const userRepo = AppDataSource.getRepository(UserEntity);
    const origin = await userRepo.findOne({ where: { id: 'user-1' } });
    const destination = await userRepo.findOne({ where: { id: 'user-2' } });

    expect(parseFloat(origin.balance.toString())).toBe(100000);
    expect(parseFloat(destination.balance.toString())).toBe(50000);
  });

  it('/transactions/:id/approve (PATCH) - should approve pending transaction', async () => {
    const txRepo = AppDataSource.getRepository(TransactionEntity);
    const transaction = await txRepo.save({
      id: 'tx-1',
      originId: 'user-1',
      destinationId: 'user-2',
      amount: 60000,
      status: 'pending',
      createdAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch(`/transactions/${transaction.id}/approve`)
      .expect(200);

    const userRepo = AppDataSource.getRepository(UserEntity);
    const origin = await userRepo.findOne({ where: { id: 'user-1' } });
    const destination = await userRepo.findOne({ where: { id: 'user-2' } });

    expect(parseFloat(origin.balance.toString())).toBe(40000);
    expect(parseFloat(destination.balance.toString())).toBe(110000);
  });

  it('/transactions (GET) - should list transactions for user', async () => {
    const txRepo = AppDataSource.getRepository(TransactionEntity);
    await txRepo.save([
      {
        id: 'tx-1',
        originId: 'user-1',
        destinationId: 'user-2',
        amount: 10000,
        status: 'confirmed',
        createdAt: new Date(),
      },
      {
        id: 'tx-2',
        originId: 'user-2',
        destinationId: 'user-1',
        amount: 5000,
        status: 'confirmed',
        createdAt: new Date(),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/transactions')
      .query({ userId: 'user-1' })
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].id).toBe('tx-2');
  });
});

