import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    client.emit('connection:status', { connected: true });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:new')
  async handleMessage(client: Socket, payload: { conversationId: string; senderId: string; senderRole: 'customer' | 'agent'; content: string }) {
    const message = await this.chatService.createMessage({
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      senderRole: payload.senderRole,
      content: payload.content,
    });

    this.server.to(payload.conversationId).emit('message:new', message);
    client.emit('message:ack', { ok: true, message });
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(client: Socket, conversationId: string) {
    client.join(conversationId);
    client.emit('joined:conversation', { conversationId });
  }
}
