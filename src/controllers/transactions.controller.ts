import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.usecase';
import { ApproveTransactionUseCase } from '../application/use-cases/approve-transaction.usecase';
import { RejectTransactionUseCase } from '../application/use-cases/reject-transaction.usecase';
import { ListTransactionsUseCase } from '../application/use-cases/list-transactions.usecase';
import { CreateTransactionDTO } from '../shared/dto/create-transaction.dto';
import { Transaction } from '../domain/entities/transaction.entity';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly approveTransactionUseCase: ApproveTransactionUseCase,
    private readonly rejectTransactionUseCase: RejectTransactionUseCase,
    private readonly listTransactionsUseCase: ListTransactionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva transacción' })
  @ApiResponse({ status: 201, description: 'Transacción creada exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'Error de negocio o validación. Ejemplos de códigos: INVALID_TRANSACTION_STATE, INSUFFICIENT_FUNDS, TECHNICAL_ERROR (validación de DTO).',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado (código: USER_NOT_FOUND).',
  })
  async create(@Body() dto: CreateTransactionDTO): Promise<Transaction> {
    return this.createTransactionUseCase.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar transacciones de un usuario' })
  @ApiQuery({ name: 'userId', required: true, description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de transacciones' })
  async list(@Query('userId') userId: string): Promise<Transaction[]> {
    return this.listTransactionsUseCase.execute(userId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprobar una transacción pendiente' })
  @ApiParam({ name: 'id', description: 'ID de la transacción' })
  @ApiResponse({ status: 200, description: 'Transacción aprobada' })
  @ApiResponse({
    status: 404,
    description: 'Transacción no encontrada (código: TRANSACTION_NOT_FOUND).',
  })
  @ApiResponse({
    status: 400,
    description:
      'Error de negocio: estado inválido o saldo insuficiente al aprobar. Códigos: INVALID_TRANSACTION_STATE, INSUFFICIENT_FUNDS.',
  })
  async approve(@Param('id') id: string): Promise<Transaction> {
    return this.approveTransactionUseCase.execute(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rechazar una transacción pendiente' })
  @ApiParam({ name: 'id', description: 'ID de la transacción' })
  @ApiResponse({ status: 200, description: 'Transacción rechazada' })
  @ApiResponse({
    status: 404,
    description: 'Transacción no encontrada (código: TRANSACTION_NOT_FOUND).',
  })
  @ApiResponse({
    status: 400,
    description: 'Error de negocio: estado inválido (código: INVALID_TRANSACTION_STATE).',
  })
  async reject(@Param('id') id: string): Promise<Transaction> {
    return this.rejectTransactionUseCase.execute(id);
  }
}

