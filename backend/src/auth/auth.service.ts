import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(payload: { name: string; email: string; password: string; role: 'customer' | 'agent' }) {
    const existing = await this.userModel.findOne({ email: payload.email.toLowerCase() });
    if (existing) {
      throw new UnauthorizedException('User already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const created = await this.userModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role,
    });

    return this.buildToken(created);
  }

  async login(payload: { email: string; password: string }) {
    const user = await this.userModel.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildToken(user);
  }

  private buildToken(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
