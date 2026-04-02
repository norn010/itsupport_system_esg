import { UserNotification, User } from '../models/index.js';
import { io } from '../server.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await UserNotification.findByUserId(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await UserNotification.markAsRead(id, req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await UserNotification.markAllAsRead(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSystemNotification = async (userId, type, title, message, ticketId) => {
  try {
    const notif = await UserNotification.create({
      user_id: userId,
      type,
      title,
      message,
      related_ticket_id: ticketId
    });
    // Emit to active socket user
    io.to(`user_${userId}`).emit('notification', notif);
  } catch (error) {
    console.error('Error creating system notification', error);
  }
};

export const notifyAllITStaff = async (type, title, message, ticketId) => {
  try {
    const staff = await User.findAllITStaff();
    staff.forEach(s => {
      createSystemNotification(s.id, type, title, message, ticketId);
    });
  } catch (error) {
    console.error('Error broadcasting system notification', error);
  }
};
