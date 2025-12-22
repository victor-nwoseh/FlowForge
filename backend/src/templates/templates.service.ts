import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Template, TemplateDocument } from './schemas/template.schema';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
  ) {}

  async findAll(category?: string): Promise<Template[]> {
    const filter: Record<string, any> = { isPublic: true };
    if (category) {
      filter.category = category;
    }
    return this.templateModel.find(filter).sort({ usageCount: -1 }).exec();
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateModel.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }).exec();
  }

  async search(query: string): Promise<Template[]> {
    if (!query || !query.trim()) {
      return this.findAll();
    }

    const regex = new RegExp(query, 'i');
    return this.templateModel
      .find({
        isPublic: true,
        $or: [{ name: regex }, { description: regex }, { tags: regex }],
      })
      .sort({ usageCount: -1 })
      .exec();
  }
}

