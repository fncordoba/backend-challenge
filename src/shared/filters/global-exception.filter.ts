import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainException,
  InsufficientFundsException,
  TransactionNotFoundException,
  UserNotFoundException,
  InvalidTransactionStateException,
} from '../../domain/exceptions/domain.exceptions';
import { DOMAIN_ERROR_MAP } from '../errors/error-codes';

interface ErrorResponseBody {
  code: string;
  message: string;
  path: string;
  timestamp: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Reglas de negocio (DomainException y subclases)
    if (exception instanceof DomainException) {
      const metadata =
        DOMAIN_ERROR_MAP[exception.constructor.name] ??
        ({
          code: 'INVALID_TRANSACTION_STATE',
          status: HttpStatus.BAD_REQUEST,
        } as const);

      const body: ErrorResponseBody = {
        code: metadata.code,
        message: exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      response.status(metadata.status).json(body);
      return;
    }

    // HttpException estándar de Nest (por ejemplo, errores de validación)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      const body: ErrorResponseBody = {
        code: 'TECHNICAL_ERROR',
        message:
          typeof responseBody === 'string'
            ? responseBody
            : (responseBody as any).message ?? exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
        details: typeof responseBody === 'string' ? undefined : responseBody,
      };

      response.status(status).json(body);
      return;
    }

    // Cualquier otro error inesperado -> error técnico genérico
    // eslint-disable-next-line no-console
    console.error('Unexpected error', exception);

    const body: ErrorResponseBody = {
      code: 'TECHNICAL_ERROR',
      message: 'Unexpected error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}


