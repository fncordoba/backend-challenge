import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/use-cases/create-user.usecase';
import { CreateUserDTO } from '../shared/dto/create-user.dto';
import { User } from '../domain/entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({
    status: 400,
    description:
      'Error de validación del DTO (por ejemplo, email inválido o balance negativo). El filtro global envuelve estos errores como TECHNICAL_ERROR.',
  })
  async create(@Body() dto: CreateUserDTO): Promise<User> {
    return this.createUserUseCase.execute(dto);
  }
}


