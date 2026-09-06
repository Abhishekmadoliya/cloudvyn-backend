import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["documentation", "video", "article", "course", "book", "github"],
      default: "documentation",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const topicSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedHours: {
      type: Number,
      default: 2,
      min: 0,
    },
    resources: {
      type: [resourceSchema],
      default: [],
    },
  },
  { _id: false }
);

const stageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    topics: {
      type: [topicSchema],
      default: [],
    },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Roadmap title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
      default: "Web Dev",
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Intermediate",
    },
    estimatedWeeks: {
      type: Number,
      default: 4,
      min: 1,
    },
    description: {
      type: String,
      default: "Step-by-step interactive career roadmap and learning path.",
      trim: true,
    },

    icon: {
      type: String,
      default: "Layers",
      trim: true,
    },
    topicCount: {
      type: Number,
      default: 0,
    },
    stages: {
      type: [stageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically compute topicCount before save
roadmapSchema.pre("save", function (next) {
  if (this.stages && Array.isArray(this.stages)) {
    this.topicCount = this.stages.reduce((acc, stage) => {
      return acc + (stage.topics && Array.isArray(stage.topics) ? stage.topics.length : 0);
    }, 0);
  }
  next();
});

export const Roadmap = mongoose.model("Roadmap", roadmapSchema);
export default Roadmap;
