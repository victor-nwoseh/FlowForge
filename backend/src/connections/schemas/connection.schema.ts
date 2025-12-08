import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Connection {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: ['slack', 'google'], required: true })
  service!: 'slack' | 'google';

  @Prop({ type: String, required: true })
  accessToken!: string;

  @Prop({ type: String })
  refreshToken?: string;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: [String], default: [] })
  scopes!: string[];

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export type ConnectionDocument = Connection & Document;

export const ConnectionSchema = SchemaFactory.createForClass(Connection);

ConnectionSchema.index({ userId: 1, service: 1 }, { unique: true });

