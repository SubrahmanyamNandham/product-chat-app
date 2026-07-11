import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './gateway/chat.gateway';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async listConversations(@CurrentUser() user: RequestUser) {
    if (user.role === 'agent') {
      return this.chatService.listForAgentInbox();
    }
    return this.chatService.listForCustomer(user.userId);
  }

  @Roles('customer')
  @Post('conversations')
  async createConversation(
    @CurrentUser() user: RequestUser,
    @Body() body: { productId: string },
  ) {
    return this.chatService.findOrCreateConversation(user.userId, body.productId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    await this.chatService.assertParticipant(id, user.userId, user.role);
    return this.chatService.getMessages(id, before);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    await this.chatService.assertParticipant(id, user.userId, user.role);
    return this.chatService.createMessage(id, user.userId, user.role, body.content);
  }

  @Post('conversations/:id/read')
  async markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.chatService.assertParticipant(id, user.userId, user.role);
    const conversation = await this.chatService.markRead(id, user.role);
    this.chatGateway.broadcastConversationUpdated(conversation);
    return conversation;
  }
}
