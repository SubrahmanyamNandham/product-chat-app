import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
export declare class UsersService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    findAll(): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, User, {}, {}> & User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
}
