import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';
export type ConversationDocument = HydratedDocument<Conversation>;
export declare class Conversation {
    customerId: Types.ObjectId;
    productId: Types.ObjectId;
    agentId?: Types.ObjectId | null;
    status: 'open' | 'closed';
    lastMessageAt?: Date | null;
    lastMessagePreview: string;
    unreadCountForAgent: number;
    unreadCountForCustomer: number;
}
export declare const ConversationSchema: import("mongoose").Schema<Conversation, import("mongoose").Model<Conversation, any, any, any, import("mongoose").Document<unknown, any, Conversation, any, {}> & Conversation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Conversation, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Conversation>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Conversation> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
