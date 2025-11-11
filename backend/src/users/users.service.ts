import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface SafeUser {
  id: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(email: string, password: string): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await this.userModel.create({
      email,
      password: hashedPassword,
    });

    return this.toSafeUser(createdUser);
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toSafeUser(user) : null;
  }

  toSafeUser(user: UserDocument): SafeUser {
    return {
      id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

