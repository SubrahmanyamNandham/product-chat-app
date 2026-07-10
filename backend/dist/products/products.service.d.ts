import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
export declare class ProductsService {
    private readonly productModel;
    constructor(productModel: Model<ProductDocument>);
    findAll(): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    create(payload: Partial<Product>): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Product, {}, {}> & Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
