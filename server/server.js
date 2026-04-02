import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { supabase } from './config/supabase.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import adminRoutes from './routes/adminRoutes.js';
import './config/firebase-admin.js'; 

// Load environment variables
dotenv.config();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://e2425-wads-l4ccg2-client.csbihub.id', process.env.FRONTEND_URL] 
      : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3031'],
    methods: ["GET", "POST"]
  }
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://e2425-wads-l4ccg2-client.csbihub.id', process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3031'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Serve frontend in production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    // Exclude API routes from serving index.html
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const activeTicketRooms = new Map();
const userNotificationRooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('clientMessage', (message) => {
    io.emit('adminMessage', {
      from: socket.id,
      text: message,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on('userJoinNotificationRoom', (userId) => {
    userNotificationRooms.set(userId, socket.id);
    socket.join(`user_notifications_${userId}`);
  });

  socket.on('adminJoinNotificationRoom', (adminId) => {
    socket.join('admin_notifications');
  });

  socket.on('createTicket', async (ticketData) => {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert([{
          user_id: socket.id, // Using socket.id as temporary user_id if not auth
          message: ticketData.message,
          bot_response: ticketData.botResponse,
          status: 'open',
          priority: 'medium'
        }])
        .select()
        .single();

      if (error) throw error;

      const ticketRoom = `ticket_${ticket.id}`;
      activeTicketRooms.set(ticket.id.toString(), {
        ticketId: ticket.id,
        userId: socket.id,
        adminId: null
      });

      socket.join(ticketRoom);
      
      socket.emit('ticketCreated', {
        id: ticket.id,
        _id: ticket.id,
        status: ticket.status,
        message: ticket.message,
        botResponse: ticket.bot_response
      });
      
      io.emit('newTicket', {
        ...ticket,
        _id: ticket.id,
        roomId: ticketRoom,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      socket.emit('ticketError', { message: 'Failed to create ticket' });
    }
  });

  socket.on('joinTicketRoom', (ticketId) => {
    const ticketRoom = `ticket_${ticketId}`;
    socket.join(ticketRoom);
    
    let ticketInfo = activeTicketRooms.get(ticketId);
    if (ticketInfo) {
      ticketInfo.adminId = socket.id;
    } else {
      activeTicketRooms.set(ticketId, { ticketId, userId: null, adminId: socket.id });
    }
    
    io.to(ticketRoom).emit('adminJoined', {
      ticketId,
      adminId: socket.id,
      time: new Date().toLocaleString()
    });
  });

  socket.on('ticketMessage', async (data) => {
    const { ticketId, message, isAdmin, sender, tempId } = data;
    const ticketRoom = `ticket_${ticketId}`;
    
    try {
      // Save message to Supabase
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          ticket_id: ticketId,
          text: message,
          sender: sender || (isAdmin ? 'admin' : 'user'),
          time: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      io.to(ticketRoom).emit('ticketMessage', {
        ticketId,
        message,
        sender: newMessage.sender,
        time: new Date(newMessage.time).toLocaleString(),
        tempId: tempId || null
      });

      // Notify user if admin replied
      if (isAdmin) {
        const { data: ticket } = await supabase.from('tickets').select('user_id, subject').eq('id', ticketId).single();
        if (ticket && ticket.user_id) {
          io.to(`user_notifications_${ticket.user_id}`).emit('adminReplyToUserTicket', {
            ticketId,
            ticketSubject: ticket.subject || 'Your Ticket',
            message,
            time: new Date().toLocaleString()
          });
        }
      }
    } catch (error) {
      console.error('Error processing ticket message:', error);
    }
  });

  socket.on('updateTicketStatus', async (data) => {
    const { ticketId, status } = data;
    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)
        .select()
        .single();

      if (ticket) {
        io.to(`ticket_${ticketId}`).emit('ticketStatusUpdated', { ticketId, status, time: new Date().toLocaleTimeString() });
        if (ticket.user_id) {
          io.to(`user_notifications_${ticket.user_id}`).emit('userTicketStatusUpdated', {
            ticketId,
            ticketSubject: ticket.subject || 'Your Ticket',
            status,
            time: new Date().toLocaleString()
          });
        }
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  });

  socket.on('disconnect', () => {
    // Cleanup logic (simplified)
    for (const [userId, socketId] of userNotificationRooms.entries()) {
      if (socketId === socket.id) userNotificationRooms.delete(userId);
    }
  });
});

app.set('io', io);

const PORT = process.env.PORT || 3032;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
