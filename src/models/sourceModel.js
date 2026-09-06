import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    publisher: { type: String },

    reliabilityScore: { type: Number, default: 70, min: 0, max: 100 },

    publishedAt: { type: Date },
  },
  { timestamps: true }
);

sourceSchema.index({ url: 1 }, { unique: true });

export default mongoose.model('Source', sourceSchema);
