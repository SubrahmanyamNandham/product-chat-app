import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../users/schemas/user.schema';
import { ProductsService } from '../products/products.service';

const MESSAGE_PAGE_SIZE = 30;

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async findOrCreateConversation(customerId: string, productId: string) {
    await this.productsService.findById(productId);

    const existing = await this.conversationModel
      .findOne({ customerId: new Types.ObjectId(customerId), productId: new Types.ObjectId(productId) })
      .populate('productId')
      .exec();
    if (existing) {
      return existing;
    }

    try {
      const created = await this.conversationModel.create({
        customerId: new Types.ObjectId(customerId),
        productId: new Types.ObjectId(productId),
      });
      return created.populate('productId');
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: number }).code : undefined;
      if (code === 11000) {
        const race = await this.conversationModel
          .findOne({ customerId: new Types.ObjectId(customerId), productId: new Types.ObjectId(productId) })
          .populate('productId')
          .exec();
        if (race) return race;
      }
      throw err;
    }
  }

  async listForCustomer(customerId: string) {
    return this.conversationModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('productId')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async listForAgentInbox() {
    return this.conversationModel
      .find()
      .populate('productId')
      .populate('customerId', 'name email')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async getConversationOrThrow(conversationId: string) {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('productId')
      .populate('customerId', 'name email')
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async assertParticipant(conversationId: string, userId: string, role: UserRole) {
    const conversation = await this.getConversationOrThrow(conversationId);
    if (role === 'agent') {
      return conversation;
    }
    if (conversation.customerId._id.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    return conversation;
  }

  async getMessages(conversationId: string, before?: string) {
    const query: Record<string, unknown> = { conversationId: new Types.ObjectId(conversationId) };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(MESSAGE_PAGE_SIZE)
      .exec();
    return messages.reverse();
  }

  async createMessage(conversationId: string, senderId: string, senderRole: UserRole, content: string) {
    const conversation = await this.getConversationOrThrow(conversationId);

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      senderRole,
      content,
      status: 'sent',
    });

    conversation.lastMessageAt = (message as { createdAt?: Date }).createdAt ?? new Date();
    conversation.lastMessagePreview = content.slice(0, 120);
    if (senderRole === 'customer') {
      conversation.unreadCountForAgent += 1;
      conversation.status = 'open';
    } else {
      conversation.unreadCountForCustomer += 1;
      if (!conversation.agentId) {
        conversation.agentId = new Types.ObjectId(senderId);
      }
    }
    await conversation.save();

    return { message, conversation };
  }

  async markRead(conversationId: string, viewerRole: UserRole) {
    const conversation = await this.getConversationOrThrow(conversationId);

    const otherRole: UserRole = viewerRole === 'agent' ? 'customer' : 'agent';
    const now = new Date();
    await this.messageModel.updateMany(
      { conversationId, senderRole: otherRole, status: { $in: ['sent', 'delivered'] } },
      { $set: { status: 'read', readAt: now } },
    );

    if (viewerRole === 'agent') {
      conversation.unreadCountForAgent = 0;
    } else {
      conversation.unreadCountForCustomer = 0;
    }
    await conversation.save();
    return conversation;
  }

  async markDelivered(conversationId: string, viewerRole: UserRole) {
    const otherRole: UserRole = viewerRole === 'agent' ? 'customer' : 'agent';
    const now = new Date();
    const result = await this.messageModel.updateMany(
      { conversationId, senderRole: otherRole, status: 'sent' },
      { $set: { status: 'delivered', deliveredAt: now } },
    );
    return result.modifiedCount;
  }
}
