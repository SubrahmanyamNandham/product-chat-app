import { IsMongoId } from 'class-validator';

export class TypingDto {
  @IsMongoId()
  conversationId: string;
}
