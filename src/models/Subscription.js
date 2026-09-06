import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
      required: true,
      unique: true,
      index: true,
    },
    planKey: {
      type: String,
      required: true,
      enum: ["free", "plus", "pro"],
      default: "free",
    },
    // When the current paid period expires (null for free tier)
    paidUntil: {
      type: Date,
      default: null,
    },
    // Last successful Razorpay payment ID (for receipts / disputes)
    lastPaymentId: {
      type: String,
      default: null,
    },
    // Last Razorpay order ID (for tracking)
    lastOrderId: {
      type: String,
      default: null,
    },
    interviewsUsedThisCycle: {
      type: Number,
      default: 0,
    },
    cycleStart: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    cycleEnd: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
