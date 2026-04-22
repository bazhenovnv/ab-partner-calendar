import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
@Injectable()
export class CategoriesService { constructor(private readonly prisma: PrismaService) {} list() { return this.prisma.category.findMany({ orderBy: { title: 'asc' }, include: { _count: { select: { events: true } } } }); } }
