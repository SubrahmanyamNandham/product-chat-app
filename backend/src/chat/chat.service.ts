import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getConversations() {
    return this.conversationModel
      .find()
      .populate('customerId', 'name email')
      .populate('productId', 'name imageUrl')
      .sort({ lastMessageAt: -1 })
      .lean();
  }

  async getConversationThread(conversationId: string) {
    const conversation = await this.conversationModel.findById(conversationId).lean();
    const messages = await this.messageModel.find({ conversationId: new Types.ObjectId(conversationId) }).sort({ createdAt: 1 }).lean();
    return { conversation, messages };
  }

  async createConversation(customerId: string, productId: string) {
    const existing = await this.conversationModel.findOne({ customerId, productId });
    if (existing) {
      return existing;
    }

    const created = await this.conversationModel.create({
      customerId,
      productId,
      status: 'open',
      lastMessageAt: new Date(),
      lastMessagePreview: 'Conversation started',
      unreadCountForAgent: 1,
      unreadCountForCustomer: 0,
    });

    return created;
  }

  async createMessage(input: { conversationId: string; senderId: string; senderRole: 'customer' | 'agent'; content: string; status?: 'sent' | 'delivered' | 'read' }) {
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(input.conversationId),
      senderId: new Types.ObjectId(input.senderId),
      senderRole: input.senderRole,
      content: input.content,
      status: input.status ?? 'sent',
    });

    await this.conversationModel.findByIdAndUpdate(input.conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: input.content,
      unreadCountForAgent: input.senderRole === 'customer' ? 1 : 0,
      unreadCountForCustomer: input.senderRole === 'agent' ? 1 : 0,
    });

    return message;
  }
}
