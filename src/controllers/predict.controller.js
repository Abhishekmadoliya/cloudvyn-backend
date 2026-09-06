import { getPrediction } from "../services/ai.service.js";
import sanitizeText from "../utils/sanitizeText.js";

export const predictText = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.length < 3) {
      return res.json({ suggestion: "" });
    }

    const cleanText = sanitizeText(text);
    const suggestion = await getPrediction(cleanText);

    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
};
