import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

interface DummyJsonProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  images?: string[];
  thumbnail?: string;
}

const DUMMYJSON_URL = 'https://dummyjson.com/products?limit=100';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async findAll() {
    const response = await fetch(DUMMYJSON_URL);
    if (!response.ok) {
      throw new NotFoundException('Unable to load products from the catalog');
    }

    const payload = (await response.json()) as { products: DummyJsonProduct[] };
    const incoming = payload.products ?? [];

    if (incoming.length > 0) {
      await this.productModel.bulkWrite(
        incoming.map((item) => ({
          updateOne: {
            filter: { externalId: item.id },
            update: {
              $set: {
                externalId: item.id,
                name: item.title,
                description: item.description,
                price: item.price,
                imageUrl: item.images?.[0] ?? item.thumbnail ?? '',
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    return this.productModel.find({ externalId: { $exists: true } }).lean();
  }

  async findById(id: string) {
    const product = await this.productModel.findById(id).lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(payload: Partial<Product>) {
    return this.productModel.create(payload);
  }
}
