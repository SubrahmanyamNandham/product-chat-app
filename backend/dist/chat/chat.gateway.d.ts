import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    constructor(chatService: ChatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(client: Socket, payload: {
        conversationId: string;
        senderId: string;
        senderRole: 'customer' | 'agent';
        content: string;
    }): Promise<void>;
    handleJoinConversation(client: Socket, conversationId: string): Promise<void>;
}
