import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { PrismaService } from '../../services/prisma.service';

type UserRoleValue = 'ADMIN' | 'SUPERADMIN';

function normalizeRole(value?: string): UserRoleValue {
  return value === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  private selectSafeUser = {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  @Get()
  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.selectSafeUser,
    });
  }

  @Post()
  async create(
    @Body()
    body: {
      email: string;
      name: string;
      password: string;
      role?: UserRoleValue;
    },
  ) {
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim() || 'Администратор';
    const password = body.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('Email и пароль обязательны');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    return this.prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name,
        passwordHash,
        role: normalizeRole(body.role),
        createdAt: now,
        updatedAt: now,
      },
      select: this.selectSafeUser,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      email?: string;
      name?: string;
      password?: string;
      role?: UserRoleValue;
    },
  ) {
    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.role !== undefined) data.role = normalizeRole(body.role);
    if (body.password?.trim()) data.passwordHash = await bcrypt.hash(body.password.trim(), 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.selectSafeUser,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.user.delete({
      where: { id },
      select: this.selectSafeUser,
    });
  }
}
