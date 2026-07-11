import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findAll() {
    return this.userModel.find().select('-passwordHash').lean();
  }

  async findById(id: string) {
    return this.userModel.findById(id).select('-passwordHash').lean();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
  }

  async create(data: { name: string; email: string; passwordHash: string; role: 'customer' | 'agent' }) {
    return this.userModel.create(data);
  }
}
