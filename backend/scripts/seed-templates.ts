import { connect, connection, model } from 'mongoose';
import { Template, TemplateSchema } from '../src/templates/schemas/template.schema';
import { seedTemplates } from '../src/templates/seeds/templates.seed';

async function run() {
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/flowforge';
  await connect(mongoUri);
  const TemplateModel = model<Template>('Template', TemplateSchema);
  await seedTemplates(TemplateModel);
  await connection.close();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

