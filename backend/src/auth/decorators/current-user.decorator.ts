import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';

export interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
