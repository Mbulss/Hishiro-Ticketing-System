import { supabase } from '../config/supabase.js';

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*, users!tickets_user_id_fkey(username, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map id to _id and dates for frontend compatibility
    const compatTickets = tickets.map(t => ({ 
      ...t, 
      _id: t.id,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    res.status(200).json(compatTickets);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = async (req, res) => {
  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, messages(*), ticket_notes(*), users!tickets_user_id_fkey(username, email)')
      .eq('id', req.params.id)
      .single();

    if (error || !ticket) {
      console.error('getTicket error:', error);
      return res.status(404).json({ message: 'Ticket not found' });
    }
    // Map id to _id and dates for frontend compatibility
    const compatTicket = { 
      ...ticket, 
      _id: ticket.id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      messages: ticket.messages?.map(m => ({ 
        ...m, 
        _id: m.id,
        createdAt: m.created_at || m.time 
      }))
    };
    res.status(200).json(compatTicket);
  } catch (error) {
    console.error('getTicket catch error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = async (req, res) => {
  try {
    const { userId, subject, message, botResponse, priority } = req.body;
    
    // Insert ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([
        {
          user_id: userId,
          subject,
          message,
          bot_response: botResponse,
          priority: priority || 'medium'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Emit notification to all admins about new ticket
    const io = req.app.get('io');
    if (io) {
      io.to('admin_notifications').emit('newTicketCreated', {
        ticketId: ticket.id,
        ticketSubject: ticket.subject || 'New Support Request',
        userEmail: req.user.email || 'Unknown User',
        userName: req.user.username || req.user.email?.split('@')[0] || 'User',
        message: ticket.message,
        priority: ticket.priority || 'medium',
        time: new Date().toLocaleString()
      });

      if (ticket.priority === 'high') {
        io.to('admin_notifications').emit('urgentTicketAlert', {
          ticketId: ticket.id,
          ticketSubject: ticket.subject || 'Urgent Support Request',
          userName: req.user.username || req.user.email?.split('@')[0] || 'User',
          message: ticket.message,
          time: new Date().toLocaleString()
        });
      }
    }

    res.status(201).json({ 
      ...ticket, 
      _id: ticket.id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
const updateTicket = async (req, res) => {
  try {
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ message: 'Ticket not found or update failed' });
    }
    res.status(200).json({ 
      ...updatedTicket, 
      _id: updatedTicket.id,
      createdAt: updatedTicket.created_at,
      updatedAt: updatedTicket.updated_at
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private
const deleteTicket = async (req, res) => {
  try {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(200).json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get tickets for current user
// @route   GET /api/tickets/user
// @access  Private
const getUserTickets = async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map id to _id and dates for frontend compatibility
    const compatTickets = tickets.map(t => ({ 
      ...t, 
      _id: t.id,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    res.status(200).json(compatTickets);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add admin message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private (Admin check in route/middleware)
const addTicketMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { text, status, priority, tempId } = req.body;
    
    if (!text) return res.status(400).json({ message: 'Message text is required' });

    // Update ticket status/priority if provided
    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;

    if (Object.keys(updates).length > 0) {
      await supabase.from('tickets').update(updates).eq('id', ticketId);
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          ticket_id: ticketId,
          text,
          sender: 'admin',
          time: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Socket notifications
    const io = req.app.get('io');
    if (io) {
      const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
      const ticketRoom = `ticket_${ticketId}`;
      const userNotificationRoom = `user_notifications_${ticket.user_id}`;

      io.to(ticketRoom).emit('ticketMessage', {
        ticketId,
        message: text,
        sender: 'admin',
        time: message.time,
        tempId
      });

      io.to(userNotificationRoom).emit('adminReplyToUserTicket', {
        ticketId,
        ticketSubject: ticket.subject || 'Your Ticket',
        message: text,
        time: new Date().toLocaleString()
      });

      if (status) {
        io.to(ticketRoom).emit('ticketStatusUpdated', { ticketId, status, time: new Date().toLocaleString() });
        io.to(userNotificationRoom).emit('userTicketStatusUpdated', { ticketId, ticketSubject: ticket.subject, status, time: new Date().toLocaleString() });
      }
    }

    res.json({ message: { ...message, _id: message.id } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all messages for a ticket
// @route   GET /api/tickets/:id/messages
// @access  Private
const getTicketMessages = async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', req.params.id)
      .order('time', { ascending: true });

    if (error) throw error;
    // Map id to _id for frontend compatibility
    const compatMessages = messages.map(m => ({ ...m, _id: m.id }));
    res.json(compatMessages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add user message to ticket
// @route   POST /api/tickets/:id/user-message
// @access  Private
const addUserTicketMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { text, tempId } = req.body;
    
    if (!text) return res.status(400).json({ message: 'Message text is required' });

    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Allow owner or admin
    if (ticket.user_id !== req.user.uid && !req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized to message this ticket' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          ticket_id: ticketId,
          text,
          sender: 'user',
          time: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    const io = req.app.get('io');
    if (io) {
      io.to(`ticket_${ticketId}`).emit('ticketMessage', {
        ticketId,
        message: text,
        sender: 'user',
        time: message.time,
        tempId
      });
    }

    res.json({ message: { ...message, _id: message.id } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getUserTickets,
  addTicketMessage,
  getTicketMessages,
  addUserTicketMessage
};