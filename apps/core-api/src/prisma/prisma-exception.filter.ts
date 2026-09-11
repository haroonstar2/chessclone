import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  // This method is called when an exception is caught.
  // It checks if the exception is a database connection error and returns a 503 Service Unavailable response if so.
  // Otherwise, it returns a 500 Internal Server Error response.
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const prismaException = exception as Prisma.PrismaClientKnownRequestError;

    // P2024 is Prisma's code for a connection pool timeout
    const isConnectionError =
      prismaException.code === 'P2024' ||
      prismaException.code === 'ECONNREFUSED' ||
      prismaException.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      this.logger.error('Database connection lost during request execution.');

      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message:
          'The database is temporarily unreachable. Please try again in a moment.',
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target =
            (exception.meta?.target as string[])?.join(', ') || 'field';
          return response.status(HttpStatus.CONFLICT).json({
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: `A record with this ${target} already exists.`,
          });
        }
        case 'P2025':
          return response.status(HttpStatus.NOT_FOUND).json({
            statusCode: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: 'The requested record was not found.',
          });
        case 'P2003':
          return response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Bad Request',
            message: 'Invalid reference or foreign key constraint violation.',
          });
        case 'P2021':
        case 'P2022':
          // Missing table or column
          this.logger.error(
            `Database schema mismatch (${exception.code}): ${exception.message}`,
          );
          return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error',
            message:
              'A database schema error occurred. Please try again later.',
          });
      }
    }
    // Default 500 for other Prisma query errors

    this.logger.error(
      'An unexpected error occurred during request execution.',
      exception,
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
