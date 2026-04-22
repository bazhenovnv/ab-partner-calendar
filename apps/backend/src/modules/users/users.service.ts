import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
@Injectable()
export class UsersService { constructor(private readonly prisma: PrismaService) {} findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email } }); } listAdmins() { return this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } }, select: { id: true, email: true, name: true, role: true, createdAt: true } }); } }
