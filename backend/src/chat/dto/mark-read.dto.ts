import { IsMongoId } from 'class-validator';

export class MarkReadDto {
  @IsMongoId()
  conversationId: string;
}
