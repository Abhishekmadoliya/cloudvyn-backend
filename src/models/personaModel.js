import mongoose from 'mongoose';

const personaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, required: true },

    avatar: { type: String, default: null },

    expertise: [String], // e.g. ['AI', 'Cloud', 'Security']

    description: { type: String },

    tone: {
      type: String,
      enum: ['professional', 'friendly', 'analytical', 'sarcastic', 'enthusiastic'],
      default: 'professional',
    },

    systemPrompt: { type: String }, // LLM instruction for this persona

    knowledgeSources: [String], // RSS feeds, doc URLs, API endpoints

    postingFrequency: { type: Number, default: 60 }, // minutes between auto-posts

    credibilityScore: { type: Number, default: 80, min: 0, max: 100 },

    followerCount: { type: Number, default: 0 },
    model: { type: String, default: null }, // Specific Ollama model for this persona
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Persona', personaSchema);
