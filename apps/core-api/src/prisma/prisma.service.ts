import 'dotenv/config';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  // This method is called when the module is initialized. It connects to the database and tests the connection.
  async onModuleInit() {
    this.logger.log('Connecting to the database...');

    try {
      // Test the database connection
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection successful');
    } catch (error) {
      this.logger.error('CRITICAL:Failed to connect to the database');
      this.logger.error(
        'Please check your database connection settings and ensure the database is running.',
      );
      this.logger.error(error);

      await this.$disconnect(); // Disconnect from the database if the connection test fails

      throw new Error(
        'Failed to connect to the database. Please check your database connection settings and ensure the database is running.',
      );
    }

    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from the database...');
    await this.$disconnect()
      .then(() => {
        this.logger.log('Disconnected from the database');
      })
      .catch((error) => {
        this.logger.error('Error disconnecting from the database', error);
      });
  }

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }
}
