import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema({
  razorpayEventId: {
    type: String,
    required: true,
    unique: true, // Idempotency guard — duplicate key error = already processed
    index: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  processedAt: {
    type: Date,
    default: () => new Date(),
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userModel",
    default: null,
  },
});

export default mongoose.model("PaymentEvent", paymentEventSchema);
