import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({ email, password: hashedPassword });
    const user = await createdUser.save();
    return user.toObject({ versionKey: false, getters: true, virtuals: false, transform: this.removePassword });
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  private removePassword(_: unknown, ret: Record<string, unknown>) {
    if (ret && 'password' in ret) {
      delete ret.password;
    }
    return ret;
  }
}

