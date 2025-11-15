import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IDbConnection } from '../../../../shared/db/db-connection.interface';

@Injectable()
export class DbConnectionService implements IDbConnection {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createQueryRunner(): Promise<QueryRunner> {
    return this.dataSource.createQueryRunner();
  }
}

