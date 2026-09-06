import admin from "../firebase/firebaseAdmin.js";
import userModel from '../models/userModel.js';
import Subscription from '../models/Subscription.js';

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    // Attach decoded firebase user to req.user for downstream fallback if needed
    req.user = decoded;

    next();
  } catch (err) {
    console.error("Auth error (verifyFirebaseToken):", err.message);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

/**
 * Middleware: Full auth — Firebase token + MongoDB user
 * Self-healing: if a valid Firebase user is missing in MongoDB, auto-provisions their user document and free subscription.
 */
export const requireAuth = [
  verifyFirebaseToken,
  async (req, res, next) => {
    try {
      const firebaseUid = req.user?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ success: false, message: 'Unauthorized: no Firebase UID' });
      }

      let dbUser = await userModel.findOne({ firebaseUid });
      if (!dbUser) {
        // Auto-provision user in MongoDB to prevent race-condition 401 errors
        const email = req.user.email || '';
        const emailPrefix = email ? email.split('@')[0] : 'User';
        const name = req.user.name ? req.user.name.trim() : emailPrefix;
        const username = name;

        dbUser = await userModel.create({
          firebaseUid,
          email,
          username,
          name,
          role: req.user.role || 'candidate',
          profileImage: req.user.picture || null,
          picture: req.user.picture || null,
          lastLoginAt: new Date(),
        });

        // Provision free subscription
        try {
          const now = new Date();
          const cycleEnd = new Date(now);
          cycleEnd.setDate(cycleEnd.getDate() + 30);

          await Subscription.findOneAndUpdate(
            { userId: dbUser._id },
            {
              $setOnInsert: {
                userId: dbUser._id,
                planKey: "free",
                paidUntil: null,
                cycleStart: now,
                cycleEnd: cycleEnd,
                interviewsUsedThisCycle: 0,
              },
            },
            { upsert: true, new: true }
          );
        } catch (subErr) {
          console.error('[requireAuth] Auto-provision subscription error:', subErr.message);
        }
      }

      req.dbUser = dbUser;

      // Also merge to req.user for backward compatibility in some controllers
      req.user = {
        ...req.user,
        ...dbUser.toObject()
      };

      next();
    } catch (err) {
      console.error('requireAuth error:', err);
      res.status(500).json({ success: false, message: 'Server error during authentication' });
    }
  },
];

/**
 * Middleware: Admin guard — checks MongoDB role and Firebase token custom claims
 */
export const requireAdmin = async (req, res, next) => {
  if (!req.dbUser) {
    return res.status(401).json({ success: false, message: 'requireAdmin: dbUser not attached — ensure requireAuth runs first' });
  }

  const isDbAdmin = req.dbUser.role === 'admin' || req.dbUser.role === 'Admin';
  const isFirebaseAdmin = req.user?.admin === true || req.user?.role === 'admin' || req.user?.role === 'Admin';

  if (!isDbAdmin && !isFirebaseAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
  }

  next();
};

/**
 * Composite Middleware: Full Admin Authentication (Firebase Token + DB User + Admin Role Guard)
 */
export const requireAdminAuth = [
  ...requireAuth,
  requireAdmin
];

