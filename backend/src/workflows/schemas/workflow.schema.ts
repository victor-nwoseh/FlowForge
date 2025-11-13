import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Edge, Node } from '../interfaces/workflow.interface';

@Schema()
export class Workflow {
  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: Array, default: [] })
  nodes!: Node[];

  @Prop({ type: Array, default: [] })
  edges!: Edge[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export type WorkflowDocument = Workflow & Document;

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);

