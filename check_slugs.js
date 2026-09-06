import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/interviewplatform/be/.env' });

const postSchema = new mongoose.Schema({}, { strict: false });
const FeedPost = mongoose.model('FeedPost', postSchema, 'feedposts');

async function checkPosts() {
  try {
    await mongoose.connect(process.env.db_connection_string);
    console.log('Connected to DB');
    const posts = await FeedPost.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log('Last 5 posts:');
    posts.forEach(p => {
      console.log(`ID: ${p._id}, Slug: ${p.slug}, Headline: ${p.headline}, Created: ${p.createdAt}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPosts();
