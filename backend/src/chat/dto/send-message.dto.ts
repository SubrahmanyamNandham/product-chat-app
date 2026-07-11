import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
