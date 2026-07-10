import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() body: { name: string; description: string; price: number; imageUrl: string }) {
    return this.productsService.create(body);
  }
}
