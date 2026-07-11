import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true, enum: ['customer', 'agent'] })
  senderRole: 'customer' | 'agent';

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'sent', enum: ['sent', 'delivered', 'read'] })
  status: MessageStatus;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
