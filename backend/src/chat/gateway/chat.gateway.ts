import { Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat.service';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import { UserRole } from '../../users/schemas/user.schema';
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: UserRole;
  };
}

const AGENTS_ROOM = 'agents';
const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;
const userRoom = (userId: string) => `user:${userId}`;

/**
 * Single namespace, rooms keyed by conversationId. This is what lets the app scale to
 * many concurrent (customer, product) threads without provisioning a socket
 * namespace per product or per customer - joining/leaving rooms is cheap and
 * Socket.IO fans out broadcasts efficiently within a room.
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Personal room lets us push "new conversation" / badge updates to a specific user.
      await client.join(userRoom(payload.sub));
      if (payload.role === 'agent') {
        await client.join(AGENTS_ROOM);
      }
    } catch (err) {
      this.logger.warn(`Rejected socket connection: ${(err as Error).message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async onJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.assertParticipant(
      data.conversationId,
      client.data.userId,
      client.data.role,
    );
    await client.join(conversationRoom(data.conversationId));
    return { joined: data.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async onLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(conversationRoom(data.conversationId));
    return { left: data.conversationId };
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!data.content?.trim()) {
      throw new WsException('Message content cannot be empty');
    }

    await this.chatService.assertParticipant(
      data.conversationId,
      client.data.userId,
      client.data.role,
    );

    // Persist first, then broadcast - durability never depends on the socket layer alone.
    const { message, conversation } = await this.chatService.createMessage(
      data.conversationId,
      client.data.userId,
      client.data.role,
      data.content.trim(),
    );

    this.server.to(conversationRoom(data.conversationId)).emit('message:new', message);
    this.broadcastConversationUpdated(conversation);

    return message;
  }

  @SubscribeMessage('typing:start')
  onTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(conversationRoom(data.conversationId)).emit('typing:start', {
      conversationId: data.conversationId,
      role: client.data.role,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.to(conversationRoom(data.conversationId)).emit('typing:stop', {
      conversationId: data.conversationId,
      role: client.data.role,
    });
  }

  @SubscribeMessage('message:read')
  async onMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.assertParticipant(
      data.conversationId,
      client.data.userId,
      client.data.role,
    );
    const conversation = await this.chatService.markRead(data.conversationId, client.data.role);
    this.broadcastConversationUpdated(conversation);
    return conversation;
  }

  /** Notifies the agent inbox and the owning customer that a thread's metadata changed. */
  broadcastConversationUpdated(conversation: unknown) {
    const conv = conversation as {
      customerId: { toString(): string } | string;
      _id: unknown;
    };
    const customerId =
      typeof conv.customerId === 'string' ? conv.customerId : conv.customerId.toString();

    this.server.to(AGENTS_ROOM).emit('conversation:updated', conversation);
    this.server.to(userRoom(customerId)).emit('conversation:updated', conversation);
  }

  private extractToken(client: Socket): string {
    const authToken =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined);
    if (!authToken) {
      throw new Error('No auth token provided');
    }
    return authToken.replace('Bearer ', '');
  }
}
