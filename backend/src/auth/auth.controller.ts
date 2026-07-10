import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class SignupDto {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'agent';
}

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
