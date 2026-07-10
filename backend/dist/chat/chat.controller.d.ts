import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getConversations(): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getConversationThread(conversationId: string): Promise<{
        conversation: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>) | null;
        messages: (import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
    }>;
    createConversation(body: {
        customerId: string;
        productId: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/conversation.schema").Conversation, {}, {}> & import("./schemas/conversation.schema").Conversation & {
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
    createMessage(body: {
        conversationId: string;
        senderId: string;
        senderRole: 'customer' | 'agent';
        content: string;
        status?: 'sent' | 'delivered' | 'read';
    }): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/message.schema").Message, {}, {}> & import("./schemas/message.schema").Message & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
