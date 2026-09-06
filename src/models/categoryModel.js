import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    // Example: Human Resource, Software Engineer, System Design
  },
  description: {
    type: String,
    required: true
  },
  color: {
    type: String
  },
  questions: {
    type: [String],   // An array of strings
    required: true
  }
});

export default mongoose.model("Category", categorySchema);
