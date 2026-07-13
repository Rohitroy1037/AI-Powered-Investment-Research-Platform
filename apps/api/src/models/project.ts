import { InferSchemaType, Schema, model } from 'mongoose';
const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
projectSchema.index({ key: 1 }, { unique: true });
projectSchema.index({ owner: 1, archivedAt: 1 });
projectSchema.index({ members: 1 });
export type Project = InferSchemaType<typeof projectSchema>;
export const ProjectModel = model('Project', projectSchema);
