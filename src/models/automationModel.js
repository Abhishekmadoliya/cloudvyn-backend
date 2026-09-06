import mongoose from "mongoose";

const automationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be longer than 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        index: true
    },
    useCase: {
        type: String,
        required: [true, 'Use case is required'],
        index: true
    },
    tags: {
        type: [String],
        default: []
    },
    image: {
        type: String,
        required: false
    },
    content: {
        type: String, // Extended content for detail page
        required: false
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    }
}, {
    timestamps: true
});

export default mongoose.model("Automation", automationSchema);
