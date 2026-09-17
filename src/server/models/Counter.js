import "server-only";
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 1000 },
});

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export async function getNextSequence(key) {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { sequence: 1 } },
    { new: true, upsert: true },
  );
  return counter.sequence;
}

export default Counter;
