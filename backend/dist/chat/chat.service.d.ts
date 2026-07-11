import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { UserRole } from '../users/schemas/user.schema';
import { ProductsService } from '../products/products.service';
export declare class ChatService {
    private readonly conversationModel;
    private readonly messageModel;
    private readonly productsService;
    constructor(conversationModel: Model<ConversationDocument>, messageModel: Model<MessageDocument>, productsService: ProductsService);
    findOrCreateConversation(customerId: string, productId: string): Promise<Omit<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>, never>>;
    listForCustomer(customerId: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    listForAgentInbox(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    getConversationOrThrow(conversationId: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
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
    assertParticipant(conversationId: string, userId: string, role: UserRole): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
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
    getMessages(conversationId: string, before?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    createMessage(conversationId: string, senderId: string, senderRole: UserRole, content: string): Promise<{
        message: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Message, {}, {}> & Message & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        conversation: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
    }>;
    markRead(conversationId: string, viewerRole: UserRole): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Conversation, {}, {}> & Conversation & {
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
    markDelivered(conversationId: string, viewerRole: UserRole): Promise<number>;
}
