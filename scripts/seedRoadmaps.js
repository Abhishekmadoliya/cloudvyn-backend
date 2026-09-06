import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Roadmap } from "../src/models/roadmapModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from be/.env
configDotenv({ path: path.join(__dirname, "../.env") });

async function seed() {
  const dbUri = process.env.db_connection_string;
  if (!dbUri) {
    console.error("Error: db_connection_string is not defined in .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(dbUri);
    console.log("MongoDB connected.");

    const roadmapsDataPath = path.resolve(__dirname, "../../cloudvyn-fe/data/roadmaps-data.js");
    const dataUrl = pathToFileURL(roadmapsDataPath).href;
    console.log("Importing from:", dataUrl);

    const roadmapsDataModule = await import(dataUrl);
    const roadmaps = roadmapsDataModule.roadmaps || [];

    console.log(`Found ${roadmaps.length} roadmaps in roadmaps-data.js to seed.`);

    let inserted = 0;

    for (let index = 0; index < roadmaps.length; index++) {
      const r = roadmaps[index];
      const stages = r.stages || [];
      const topicCount = stages.reduce((acc, st) => {
        return acc + (st.topics && Array.isArray(st.topics) ? st.topics.length : 0);
      }, 0);

      const updateData = {
        title: r.title,
        slug: r.slug,
        category: r.category || "Web Dev",
        difficulty: r.difficulty || "Intermediate",
        estimatedWeeks: r.estimatedWeeks || 4,
        description: r.description || "",
        icon: r.icon || "Layers",
        stages: stages,
        topicCount: topicCount,
        status: "published",
        isFeatured: index < 4,
        order: index + 1,
      };

      const result = await Roadmap.findOneAndUpdate(
        { slug: r.slug },
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result) {
        console.log(`✓ [${index + 1}/${roadmaps.length}] Seeded: ${r.title} (${r.slug}) - ${stages.length} stages, ${topicCount} topics`);
        inserted++;
      }
    }

    console.log(`\n🎉 Successfully seeded ${inserted} roadmaps in MongoDB!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding roadmaps:", error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seed();
