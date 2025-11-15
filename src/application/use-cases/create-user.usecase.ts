import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUserRepository } from '../../domain/ports/user-repository.interface';
import { USER_REPOSITORY_TOKEN } from '../../shared/di/tokens';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDTO } from '../../shared/dto/create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDTO): Promise<User> {
    const id = dto.id ?? randomUUID();
    const user = new User(id, dto.name, dto.email, dto.balance);
    return this.userRepository.create(user);
  }
}


