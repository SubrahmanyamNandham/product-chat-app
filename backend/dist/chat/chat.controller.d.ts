import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './gateway/chat.gateway';
export declare class ChatController {
    private chatService;
    private chatGateway;
    constructor(chatService: ChatService, chatGateway: ChatGateway);
    listConversations(user: RequestUser): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    createConversation(user: RequestUser, body: {
        productId: string;
    }): Promise<Omit<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>, never>>;
    getMessages(user: RequestUser, id: string, before?: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    sendMessage(user: RequestUser, id: string, body: {
        content: string;
    }): Promise<{
        message: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        conversation: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
    }>;
    markRead(user: RequestUser, id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
