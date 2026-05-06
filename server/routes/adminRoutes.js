import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { supabase } from '../config/supabase.js';
import admin from '../config/firebase-admin.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations (admin access required)
 */

/**
 * @swagger
 * /api/admin/check:
 *   get:
 *     summary: Check if current user has admin privileges
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin status check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                   description: Whether the user has admin privileges
 *                   example: true
 *       403:
 *         description: User is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Check if user is admin
router.get('/check', protect, async (req, res) => {
  try {
    console.log('Checking admin status for user:', req.user.uid);
    
    // req.user is already fetched in authMiddleware
    if (req.user?.is_admin) {
      console.log('User is admin');
      res.json({ isAdmin: true });
    } else {
      console.log('User is not admin');
      res.status(403).json({ isAdmin: false });
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all users (admin only)
router.get('/users', protect, async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to view users' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map uid to _id and dates for frontend compatibility
    const compatUsers = users.map(u => ({ 
      ...u, 
      _id: u.uid,
      isAdmin: u.is_admin,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));
    res.json(compatUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user (admin only)
router.post('/users', protect, async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to create users' });
    }

    const { email, password, role } = req.body;

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Create user in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          uid: userRecord.uid,
          email: userRecord.email,
          is_admin: role === 'admin'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:uid', protect, async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to delete users' });
    }

    // Delete user from Firebase
    await admin.auth().deleteUser(req.params.uid);

    // Delete user from Supabase
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('uid', req.params.uid);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set admin status for a user
router.post('/set-admin/:uid', protect, async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to set admin status' });
    }

    // Update user in database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ is_admin: true })
      .eq('uid', req.params.uid)
      .select()
      .single();

    if (error || !updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Admin status set successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove admin status from a user
router.post('/remove-admin/:uid', protect, async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to remove admin status' });
    }

    // Update user in database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('uid', req.params.uid)
      .select()
      .single();

    if (error || !updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Admin status removed successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;