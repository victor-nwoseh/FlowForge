import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

