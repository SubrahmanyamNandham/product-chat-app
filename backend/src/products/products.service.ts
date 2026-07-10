import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async findAll() {
    return this.productModel.find().lean();
  }

  async create(payload: Partial<Product>) {
    return this.productModel.create(payload);
  }
}
