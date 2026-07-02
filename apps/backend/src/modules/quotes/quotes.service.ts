import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface CreateQuoteDto {
  text: string;
  author: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateQuoteDto {
  text?: string;
  author?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.quote.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, text: true, author: true },
    });
  }

  listAdmin() {
    return this.prisma.quote.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateQuoteDto) {
    return this.prisma.quote.create({ data: dto });
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.findOrFail(id);
    return this.prisma.quote.update({ where: { id }, data: dto });
  }

  async toggle(id: string) {
    const q = await this.findOrFail(id);
    return this.prisma.quote.update({ where: { id }, data: { isActive: !q.isActive } });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    return this.prisma.quote.delete({ where: { id } });
  }

  private async findOrFail(id: string) {
    const q = await this.prisma.quote.findUnique({ where: { id } });
    if (!q) throw new NotFoundException(`Quote ${id} not found`);
    return q;
  }
}
