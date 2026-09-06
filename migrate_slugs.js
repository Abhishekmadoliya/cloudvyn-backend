import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateSlug } from './src/utils/slugify.js';

dotenv.config();

const postSchema = new mongoose.Schema({}, { strict: false });
const FeedPost = mongoose.model('FeedPost', postSchema, 'feedposts');

async function migrate() {
  try {
    await mongoose.connect(process.env.db_connection_string);
    console.log('Connected to DB');
    
    const postsWithoutSlugs = await FeedPost.find({ 
      $or: [
        { slug: { $exists: false } }, 
        { slug: null }, 
        { slug: "" }
      ] 
    });
    
    console.log(`Found ${postsWithoutSlugs.length} posts without slugs.`);
    
    for (const post of postsWithoutSlugs) {
      const slug = generateSlug(post.headline || post.topic || "post");
      await FeedPost.updateOne({ _id: post._id }, { $set: { slug } });
      console.log(`Updated post ${post._id} with slug: ${slug}`);
    }
    
    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
