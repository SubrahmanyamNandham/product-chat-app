import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('conversations')
  getConversations() {
    return this.chatService.getConversations();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('conversations/:conversationId')
  getConversationThread(@Param('conversationId') conversationId: string) {
    return this.chatService.getConversationThread(conversationId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('conversations')
  createConversation(@Body() body: { customerId: string; productId: string }) {
    return this.chatService.createConversation(body.customerId, body.productId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('messages')
  createMessage(@Body() body: { conversationId: string; senderId: string; senderRole: 'customer' | 'agent'; content: string; status?: 'sent' | 'delivered' | 'read' }) {
    return this.chatService.createMessage(body);
  }
}
