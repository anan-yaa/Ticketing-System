import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Ensure dotenv loads before PrismaService initializes
dotenv.config();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let dbUrl = process.env.DATABASE_URL;

    // Validate and verify DATABASE_URL exists
    if (dbUrl) {
      console.log('DATABASE_URL is set:', dbUrl.replace(/:([^:@]+)@/, ':***@'));
    } else {
      console.error('DATABASE_URL is not set in environment variables!');
    }

    // Handle special characters in DB password using URL encoding
    try {
      if (dbUrl) {
        const parsedUrl = new URL(dbUrl);
        if (parsedUrl.password) {
          // Decode first to prevent double encoding, then encode
          const decodedPassword = decodeURIComponent(parsedUrl.password);
          parsedUrl.password = encodeURIComponent(decodedPassword);
          dbUrl = parsedUrl.toString();
        }
      }
    } catch (err) {
      console.error('Failed to parse and encode DATABASE_URL password:', err);
    }

    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      this.logger.log('Attempting to connect to the PostgreSQL database...');
      await this.$connect();
      this.logger.log('Successfully connected to the database.');
    } catch (error) {
      this.logger.error('Failed to connect to the database on startup. Exiting process...', error);
      // Add proper startup error handling for DB connection failures
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
