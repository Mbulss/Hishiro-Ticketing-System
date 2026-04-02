import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

// @desc    Register a new user from Firebase Auth
// @route   POST /api/users
// @access  Public
const registerFirebaseUser = async (req, res) => {
  console.log('Received registration request:', req.body);
  const { uid, email, username, gender, phone, address, authProvider } = req.body;

  if (!uid || !email) {
    console.log('Missing required fields:', { uid, email });
    return res.status(400).json({ message: 'Missing uid or email' });
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return res.status(200).json({
        message: 'User already exists',
        user: { ...existingUser, _id: existingUser.uid }
      });
    }

    // Check if phone number already exists
    if (phone) { 
      const { data: phoneUser } = await supabase
        .from('users')
        .select('uid')
        .eq('phone', phone)
        .single();

      if (phoneUser) {
        return res.status(400).json({ 
          message: 'Phone number already in use.' 
        });
      }
    }

    // Create user in Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        { 
          uid, 
          email, 
          username: username || email.split('@')[0], 
          gender, 
          phone, 
          address, 
          auth_provider: authProvider || 'firebase' 
        }
      ])
      .select()
      .single();

    if (createError) throw createError;

    console.log('User created successfully:', newUser);
    
    return res.status(201).json({
      message: 'User registered successfully',
      user: { ...newUser, _id: newUser.uid }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      message: 'Error creating user',
      error: error.message 
    });
  }
};

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  const user = req.user; // Populated by auth middleware
  res.status(200).json({
    id: user.uid,
    _id: user.uid,
    email: user.email,
    username: user.username,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    photoURL: user.photo_url || user.photoURL,
    isAdmin: user.is_admin,
  });
};

// @desc    Update current user
// @route   PATCH /api/users/me
// @access  Private
const updateMe = async (req, res) => {
  const user = req.user; 
  const { username, gender, phone, address, photoURL } = req.body;

  const updates = {};
  if (username !== undefined) updates.username = username;
  if (gender !== undefined) updates.gender = gender;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (photoURL !== undefined) updates.photo_url = photoURL;

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('uid', user.uid)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ message: 'Update failed', error: updateError.message });
  }

  res.status(200).json({
    id: updatedUser.uid,
    _id: updatedUser.uid,
    email: updatedUser.email,
    username: updatedUser.username,
    gender: updatedUser.gender,
    phone: updatedUser.phone,
    address: updatedUser.address,
    photoURL: updatedUser.photo_url,
    isAdmin: updatedUser.is_admin,
  });
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    // Map uid to _id for frontend compatibility
    const compatUsers = users.map(u => ({ ...u, _id: u.uid }));
    res.status(200).json(compatUsers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// @desc    Update any user by ID (admin only)
// @route   PATCH /api/users/:id
// @access  Private/Admin
const updateUserById = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const { id } = req.params;
    const { username, gender, phone, address, photoURL, isAdmin } = req.body;

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (gender !== undefined) updates.gender = gender;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (photoURL !== undefined) updates.photo_url = photoURL;
    if (isAdmin !== undefined) updates.is_admin = isAdmin;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('uid', id)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ message: 'User not found or update failed' });
    }

    res.status(200).json({ ...updatedUser, _id: updatedUser.uid });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};

export {
  getMe,
  registerFirebaseUser,
  updateMe,
  getAllUsers,
  updateUserById,
};