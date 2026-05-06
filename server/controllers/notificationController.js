import { supabase } from '../config/supabase.js';

// Get notifications for user
export const getNotifications = async (req, res) => {
  try {
    const { uid, is_admin } = req.user;
    
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (is_admin) {
      // Admins get notifications specifically for them OR general 'admin' notifications
      query = query.or(`user_id.eq.${uid},user_id.eq.admin`);
    } else {
      query = query.eq('user_id', uid);
    }
    
    const { data: notifications, error } = await query;
    
    if (error) throw error;
    
    // Map id to _id and dates
    const compatNotifs = notifications.map(n => ({
      ...n,
      _id: n.id,
      timestamp: n.created_at
    }));
    
    res.json(compatNotifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    const { uid, is_admin } = req.user;
    
    // We have to build the query carefully. Supabase .update() with .or() is fine.
    let query = supabase.from('notifications').update({ read: true }).eq('read', false);
    
    if (is_admin) {
      query = query.or(`user_id.eq.${uid},user_id.eq.admin`);
    } else {
      query = query.eq('user_id', uid);
    }
    
    const { error } = await query;
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
