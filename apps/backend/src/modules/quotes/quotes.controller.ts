import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { QuotesService, CreateQuoteDto, UpdateQuoteDto } from './quotes.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get('public')
  listPublic() {
    return this.quotes.listPublic();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  listAdmin() {
    return this.quotes.listAdmin();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotes.update(id, dto);
  }

  @Patch('admin/:id/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string) {
    return this.quotes.toggle(id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.quotes.remove(id);
  }
}
