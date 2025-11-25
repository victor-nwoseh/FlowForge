import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
export class Execution {
  @Prop({ type: Types.ObjectId, ref: 'Workflow', required: true })
  workflowId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'running' | 'success' | 'failed';

  @Prop({ type: Object, default: {} })
  triggerData!: Record<string, any>;

  @Prop({ type: Array, default: [] })
  logs!: any[];

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Date })
  startTime?: Date;

  @Prop({ type: Date })
  endTime?: Date;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export type ExecutionDocument = HydratedDocument<Execution>;

export const ExecutionSchema = SchemaFactory.createForClass(Execution);


