// Ported from userController.js. Context/response adapters preserve status and operation ordering.
import 'server-only';
import User from '../models/User.js';

export const getUsers = async (req, res) => {
    const { role, search, isActive, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive && isActive !== '') {
        filter.isActive = isActive === 'true';
    }
    if (search) {
        filter.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
        User.find(filter).sort({ firstName: 1 }).skip(skip).limit(Number(limit)),
        User.countDocuments(filter),
    ]);

    res.json({ success: true, count: users.length, total, data: users });
};

export const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json({ success: true, data: user });
};

export const updateUser = async (req, res) => {
    const { firstName, lastName, phone, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { firstName, lastName, phone, role, isActive },
        { new: true, runValidators: true }
    );
    if (!user) { res.status(404); throw new Error('User not found'); }
    res.json({ success: true, data: user });
};

export const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    if (user._id.toString() === req.user._id.toString()) {
        res.status(400); throw new Error('Cannot delete yourself');
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted permanently from database' });
};