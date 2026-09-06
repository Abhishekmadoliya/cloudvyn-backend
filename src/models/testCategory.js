import mongoose from 'mongoose';

const testCategorySchema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    slug: {
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        required:true,
    }
})