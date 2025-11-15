import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'version',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'originId',
            type: 'varchar',
          },
          {
            name: 'destinationId',
            type: 'varchar',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'rejected'],
            default: "'pending'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_originId',
        columnNames: ['originId'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_destinationId',
        columnNames: ['destinationId'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'outbox',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'aggregateId',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'payload',
            type: 'text',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'outbox',
      new TableIndex({
        name: 'IDX_outbox_aggregateId',
        columnNames: ['aggregateId'],
      }),
    );

    await queryRunner.createIndex(
      'outbox',
      new TableIndex({
        name: 'IDX_outbox_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('outbox');
    await queryRunner.dropTable('transactions');
    await queryRunner.dropTable('users');
  }
}

