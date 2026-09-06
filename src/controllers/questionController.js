import QuestionsModel from "../models/questionModel.js";
import slugify from "slugify";

export const getQuestions = async (req, res) => {
  try {
    const questions = await QuestionsModel.find({});
    if (questions.length > 0) {
      res.status(200).json({
        success: true,
        data: questions,
        message: "all Questions fetched  succesfully",
      });
    } else {
      res.status(200).json({
        success: true,
        data: [],
        message: "No questions found",
      });
    }
  } catch (error) {
    console.log("error in questiocontroller,", error);
    res.status(500).json({
      success: false,
      error: error.error,
      message: "internet server error",
    });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const {
      question,
      category,
      subCategory,
      difficulty,
      answer,
      hints,
      companyTags,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!question || !category || !answer || !createdBy) {
      return res.status(400).json({ message: "Some fields are missing" });
    }
    const exists = await QuestionsModel.findOne({ question });
    if (exists) {
      return res.status(409).json({ message: "This question already exists" });
    }
    const slug = slugify(question, { lower: true, strict: true });

    // Create new Question
    const newQuestion = new QuestionsModel({
      question,
      category,
      subCategory,
      difficulty,
      answer,
      hints,
      companyTags,
      createdBy,
      slug
    });

    const savedQuestion = await newQuestion.save();

    return res.status(201).json({
      message: "Question created successfully",
      data: savedQuestion,
    });
  } catch (error) {
    console.log("Error in creating new question:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const searchQuestion = async (req, res) => {
  try {
    const { keyword } = req.params;

    if (!keyword) {
      return res.status(400).json({ message: "Search keyword is required" });
    }

    const results = await QuestionsModel.find({
  $or: [
    { question: { $regex: keyword, $options: "i" }},
    { answer: { $regex: keyword, $options: "i" }},
    { companyTags: { $regex: keyword, $options: "i" }}
  ]
});


    if (results.length === 0) {
      return res.status(404).json({ message: "No questions found" });
    }

    return res.status(200).json({
      message: "Questions fetched successfully",
      data: results,
    });

  } catch (error) {
    console.log("Error searching question:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getQuestionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1) Get Main Question
    const mainQ = await QuestionsModel.findOne({ slug });

    if (!mainQ) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Extract important words for matching (remove too-small words)
    // const keywords = mainQ.question
    //   .split(" ")
    //   .filter((word) => word.length > 2) // remove "is, to, of, in"
    //   .join("|"); // regex OR search

    // // 2) Find Related Questions based on question OR answer
    // const related = await QuestionsModel.find({
    //   _id: { $ne: mainQ._id }, // exclude itself
    //   $or: [
    //     { question: { $regex: keywords, $options: "i" } },
    //     { answer: { $regex: keywords, $options: "i" } }
    //   ]
    // });

    return res.status(200).json({
      message: "Fetched successfully",
      data: mainQ,
      
    });

  } catch (error) {
    console.log("Error fetching by slug:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const searchQuestionsByName = async (req, res) => {
  try {
    let { name } = req.params;   // example: "slug:what-is-the-difference-between-var-and-let"

    if (!name) {
      return res.status(400).json({ message: "Slug is required" });
    }

    // Remove "slug:" prefix if it exists
    if (name.startsWith("slug:")) {
      name = name.replace("slug:", "");
    }

    // Convert slug → keyword string
    // "what-is-the-difference-between-var-and-let" → "what is the difference between var and let"
    const keywordString = name.split("-").join(" ");

    // Break into individual keywords & remove very short words
    const words = keywordString.split(" ").filter(w => w.length > 2);

    // Create regex OR for all keywords: (what|difference|var|let)
    const regexString = words.join("|");
    const regex = new RegExp(regexString, "i");

    // Search in question OR answer
    const results = await QuestionsModel.find({
      $or: [
        { question: { $regex: regex } },
        { answer: { $regex: regex } }
      ]
    });

    if (results.length === 0) {
      return res.status(404).json({ message: "No matching questions found" });
    }

    return res.status(200).json({
      message: "Questions fetched",
      count: results.length,
      data: results
    });

  } catch (error) {
    console.log("Error searching questions:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    // Get update data from body
    const updateData = req.body;

    // If question text is updated, update slug also
    if (updateData.question) {
      const slugify = (await import("slugify")).default;
      updateData.slug = slugify(updateData.question, { lower: true, strict: true });
    }

    // Update question
    const updatedQuestion = await QuestionsModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // returns updated data instead of old
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.status(200).json({
      message: "Question updated successfully",
      data: updatedQuestion,
    });

  } catch (error) {
    console.log("Error updating question:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuestion = await QuestionsModel.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "No question found" });
    }

    return res.status(200).json({ message: "Question deleted successfully" });

  } catch (error) {
    console.log("Error while deleting question:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
