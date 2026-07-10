import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  agentId?: Types.ObjectId | null;

  @Prop({ enum: ['open', 'closed'], default: 'open' })
  status: 'open' | 'closed';

  @Prop({ type: Date, default: null })
  lastMessageAt?: Date | null;

  @Prop({ default: '' })
  lastMessagePreview: string;

  @Prop({ default: 0 })
  unreadCountForAgent: number;

  @Prop({ default: 0 })
  unreadCountForCustomer: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ customerId: 1, productId: 1 }, { unique: true });
