import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import chatRoutes from './routes/chat.js';
import categoryRoutes from './routes/categories.js';
import noteRoutes from './routes/notes.js';
import activityRoutes from './routes/activity.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import feedbackRoutes from './routes/feedback.js';
import notificationRoutes from './routes/notifications.js';
import assetRoutes from './routes/assets.js';
import licenseRoutes from './routes/licenses.js';
import inventoryRoutes from './routes/inventory.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import rackPhotoRoutes from './routes/rackPhotos.js';
import { ChatMessage } from './models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', chatRoutes);
app.use('/api/tickets', noteRoutes);
app.use('/api/tickets', activityRoutes);
app.use('/api/tickets', feedbackRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/kb', knowledgeBaseRoutes);
app.use('/api/notifications', notificationRoutes);

// ITAM Routes
app.use('/api/assets', assetRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/rack-photos', rackPhotoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_ticket', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} joined ticket_${ticketId}`);
  });

  socket.on('leave_ticket', (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
    console.log(`Socket ${socket.id} left ticket_${ticketId}`);
  });

  socket.on('register_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });

  socket.on('typing', ({ ticketId, userName }) => {
    socket.to(`ticket_${ticketId}`).emit('typing', { userName });
  });

  socket.on('stop_typing', ({ ticketId }) => {
    socket.to(`ticket_${ticketId}`).emit('stop_typing');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export { io };
