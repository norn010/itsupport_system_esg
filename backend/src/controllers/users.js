import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    
    // Check existing
    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      password: hashedPassword,
      full_name,
      email,
      role: role || 'IT'
    });

    const result = { ...user };
    delete result.password;
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.username) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    // Check if target user is MANAGER/ADMIN — cannot be deleted
    const targetUser = await User.findById(id);
    if (targetUser && (targetUser.role === 'MANAGER' || targetUser.role === 'ADMIN')) {
      return res.status(403).json({ message: 'Cannot delete an admin/manager account' });
    }
    await User.delete(id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};
