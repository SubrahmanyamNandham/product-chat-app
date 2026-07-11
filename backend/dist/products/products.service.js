"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
const DUMMYJSON_URL = 'https://dummyjson.com/products?limit=100';
let ProductsService = class ProductsService {
    productModel;
    constructor(productModel) {
        this.productModel = productModel;
    }
    async findAll() {
        const response = await fetch(DUMMYJSON_URL);
        if (!response.ok) {
            throw new common_1.NotFoundException('Unable to load products from the catalog');
        }
        const payload = (await response.json());
        const incoming = payload.products ?? [];
        if (incoming.length > 0) {
            await this.productModel.bulkWrite(incoming.map((item) => ({
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
            })), { ordered: false });
        }
        return this.productModel.find({ externalId: { $exists: true } }).lean();
    }
    async findById(id) {
        const product = await this.productModel.findById(id).lean();
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async create(payload) {
        return this.productModel.create(payload);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProductsService);
//# sourceMappingURL=products.service.js.map