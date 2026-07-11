import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationStatus = 'open' | 'closed';
export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  agentId?: Types.ObjectId;

  @Prop({ default: 'open', enum: ['open', 'closed'] })
  status: ConversationStatus;

  @Prop()
  lastMessagePreview?: string;

  @Prop({ type: Date })
  lastMessageAt?: Date;

  @Prop({ default: 0 })
  unreadCountForAgent: number;

  @Prop({ default: 0 })
  unreadCountForCustomer: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ customerId: 1, productId: 1 }, { unique: true });
