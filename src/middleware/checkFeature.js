/**
 * checkFeature.js
 *
 * Middleware factory for feature-gating.
 * Usage: router.get('/transcript', requireAuth, checkFeature('transcriptDownload'), handler)
 *
 * Loads the user's plan and checks plan.features[featureName].
 */

import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";

export function checkFeature(featureName) {
  return async (req, res, next) => {
    try {
      const userId = req.dbUser?._id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "unauthorized" });
      }

      const sub = await Subscription.findOne({ userId });
      if (!sub) {
        return res.status(403).json({
          success: false,
          error: "no_subscription",
          message: "No subscription found.",
        });
      }

      const plan = await Plan.findOne({ key: sub.planKey });
      if (!plan) {
        return res.status(500).json({
          success: false,
          error: "plan_not_found",
          message: "Plan configuration error.",
        });
      }

      if (!plan.features[featureName]) {
        return res.status(403).json({
          success: false,
          error: "feature_not_available",
          feature: featureName,
          message: `This feature requires an upgrade. Your current plan (${plan.name}) does not include ${featureName}.`,
          currentPlan: sub.planKey,
        });
      }

      req.subscription = sub;
      req.plan = plan;
      next();
    } catch (err) {
      console.error(`checkFeature(${featureName}) error:`, err.message);
      res.status(500).json({
        success: false,
        error: "feature_check_failed",
        message: "Server error checking feature access.",
      });
    }
  };
}

/**
 * Check if user's plan supports a given language.
 * Usage: checkLanguage('hi') — blocks Hindi interviews for non-Pro users.
 */
export function checkLanguage(langCode) {
  return async (req, res, next) => {
    try {
      const userId = req.dbUser?._id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "unauthorized" });
      }

      const sub = await Subscription.findOne({ userId });
      if (!sub) {
        return res.status(403).json({ success: false, error: "no_subscription" });
      }

      const plan = await Plan.findOne({ key: sub.planKey });
      if (!plan) {
        return res.status(500).json({ success: false, error: "plan_not_found" });
      }

      if (!plan.languages.includes(langCode)) {
        return res.status(403).json({
          success: false,
          error: "language_not_available",
          language: langCode,
          message: `${langCode === "hi" ? "Hindi" : langCode} interviews require the Pro plan.`,
          currentPlan: sub.planKey,
          availableLanguages: plan.languages,
        });
      }

      req.subscription = sub;
      req.plan = plan;
      next();
    } catch (err) {
      console.error(`checkLanguage(${langCode}) error:`, err.message);
      res.status(500).json({ success: false, error: "language_check_failed" });
    }
  };
}
