import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: Types.ObjectId, ref: 'Workflow', required: true })
  workflowId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  cronExpression!: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date })
  lastRunAt?: Date;

  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ type: String })
  repeatableJobId?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export type ScheduleDocument = Schedule & Document;

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

ScheduleSchema.index({ workflowId: 1, userId: 1 });

