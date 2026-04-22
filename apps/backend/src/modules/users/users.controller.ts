import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { UsersService } from './users.service';
@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController { constructor(private readonly usersService: UsersService) {} @Get() listAdmins() { return this.usersService.listAdmins(); } }
