import "server-only";
import PosSession from "../models/PosSession.js";
import "../models/User.js";

export async function getActivePosSession(req, res) {
  const session = await PosSession.findOne({ userId: req.user._id, status: "open" });
  res.json({ success: true, data: session });
}

export async function openPosSession(req, res) {
  const existing = await PosSession.findOne({ userId: req.user._id, status: "open" });
  if (existing) {
    res.status(400);
    throw new Error("You already have an open session");
  }

  const session = new PosSession({
    userId: req.user._id,
    openingBalance: req.body.openingBalance || 0,
    notes: req.body.notes,
  });
  await session.save();
  res.status(201).json({ success: true, data: session });
}

export async function closePosSession(req, res) {
  const session = await PosSession.findOne({ userId: req.user._id, status: "open" });
  if (!session) {
    res.status(404);
    throw new Error("No open session found");
  }

  session.status = "closed";
  session.actualClosingBalance = req.body.actualClosingBalance || 0;
  session.notes = req.body.notes
    ? `${session.notes || ""}\nClosing Note: ${req.body.notes}`
    : session.notes;
  await session.save();
  res.json({ success: true, data: session });
}

export async function getPosSessions(req, res) {
  const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (userId) filter.userId = userId;
  if (startDate || endDate) {
    filter.openedAt = {};
    if (startDate) filter.openedAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.openedAt.$lte = end;
    }
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [sessions, total] = await Promise.all([
    PosSession.find(filter).populate("userId", "firstName lastName").sort({ openedAt: -1 }).skip(skip).limit(Number(limit)),
    PosSession.countDocuments(filter),
  ]);
  res.json({ success: true, count: sessions.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: sessions });
}
