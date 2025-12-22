import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TemplateDocument = Template & Document;

@Schema()
export class Template {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({
    type: String,
    enum: ['Sales', 'Marketing', 'Operations', 'Finance', 'Support', 'General'],
    required: true,
  })
  category!: string;

  @Prop({ type: Object, required: true })
  workflow!: Record<string, any>;

  @Prop({ type: Boolean, default: true })
  isPublic!: boolean;

  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: Number, default: 0 })
  usageCount!: number;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String })
  thumbnail?: string;

  @Prop({
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner',
  })
  difficulty!: string;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
TemplateSchema.index({ category: 1 });
TemplateSchema.index({ tags: 1 });

