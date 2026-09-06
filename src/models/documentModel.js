import mongoose from "mongoose";

/**
 * Schema for storing extracted PDF text chunks and their vector embeddings
 * Optimized for MongoDB Atlas Vector Search
 */
const documentChunkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  chatId: {
    type: String,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
    // Note: Vector search index is created in MongoDB Atlas UI
  },
  metadata: {
    fileName: String,
    pageNumber: Number,
    chunkIndex: Number,
    startLine: Number,
    endLine: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
});

// Compound index for user identification and fast lookups
documentChunkSchema.index({ userId: 1, uploadedAt: -1 });

const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);

export default DocumentChunk;
