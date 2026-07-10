import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { ProductDocument } from '../products/schemas/product.schema';
import { UserDocument } from '../users/schemas/user.schema';
export declare class ChatService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly productModel;
    private readonly userModel;
    constructor(conversationModel: Model<ConversationDocument>, messageModel: Model<MessageDocument>, productModel: Model<ProductDocument>, userModel: Model<UserDocument>);
    getConversations(): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    getConversationThread(conversationId: string): Promise<{
        conversation: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: Types.ObjectId;
        }>) | null;
        messages: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: Types.ObjectId;
        }>)[];
    }>;
    createConversation(customerId: string, productId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    createMessage(input: {
        conversationId: string;
        senderId: string;
        senderRole: 'customer' | 'agent';
        content: string;
        status?: 'sent' | 'delivered' | 'read';
    }): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
}
