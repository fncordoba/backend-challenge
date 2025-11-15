import { DataSource, Repository } from 'typeorm';
import { OutboxRepository } from '../infrastructure/persistence/typeorm/repositories/outbox.repository';
import { OutboxEntity } from '../infrastructure/persistence/typeorm/entities/outbox.entity';

class EventPublisher {
  async publish(type: string, payload: any): Promise<void> {
    console.log(`[EventPublisher] Publishing event: ${type}`, payload);
  }
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'belo_user',
  password: process.env.DB_PASSWORD || 'belo_pass',
  database: process.env.DB_NAME || 'belo_db',
  entities: [OutboxEntity],
  synchronize: false,
  logging: false,
});

async function runWorker() {
  try {
    await AppDataSource.initialize();
    console.log('Outbox worker started');

    const outboxRepo = AppDataSource.getRepository(OutboxEntity);
    const repository = new OutboxRepository(outboxRepo);
    const publisher = new EventPublisher();

    const processBatch = async () => {
      const pending = await repository.fetchPending(100);

      for (const event of pending) {
        try {
          await publisher.publish(event.type, JSON.parse(event.payload));
          await repository.markProcessed(event.id!);
          console.log(`Processed event ${event.id}`);
        } catch (error) {
          await repository.markFailed(event.id!, error.message);
          console.error(`Failed to process event ${event.id}:`, error);
        }
      }
    };

    setInterval(processBatch, 5000);
    await processBatch();
  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  runWorker();
}

