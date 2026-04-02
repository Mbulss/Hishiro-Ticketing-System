import express from 'express';
import {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getUserTickets,
  addTicketMessage,
  getTicketMessages,
  addUserTicketMessage
} from '../controllers/ticketController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       required:
 *         - subject
 *         - message
 *         - userId
 *         - botResponse
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *           description: The MongoDB ObjectId of the ticket
 *         userId:
 *           type: string
 *           description: The Firebase user ID of the ticket creator
 *         subject:
 *           type: string
 *           description: The ticket subject
 *         message:
 *           type: string
 *           description: The ticket message
 *         botResponse:
 *           type: string
 *           description: The initial bot response to the ticket
 *         status:
 *           type: string
 *           enum: [new, in-progress, resolved]
 *           description: The ticket status
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           description: The ticket priority
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the ticket was created
 */

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management API
 */

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Returns all tickets
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The list of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Not authorized
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *               - userId
 *               - botResponse
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               userId:
 *                 type: string
 *               botResponse:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *     responses:
 *       201:
 *         description: The ticket was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Not authorized
 */
router.route('/').get(protect, getTickets).post(protect, createTicket);

/**
 * @swagger
 * /api/tickets/user:
 *   get:
 *     summary: Get tickets for the current user
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Add route for user-specific tickets
router.get('/user', protect, getUserTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get a ticket by id
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The MongoDB ObjectId of the ticket
 *     responses:
 *       200:
 *         description: The ticket description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       404:
 *         description: The ticket was not found
 *   put:
 *     summary: Update a ticket by id
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The MongoDB ObjectId of the ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 description: The updated ticket subject
 *               message:
 *                 type: string
 *                 description: The updated ticket message
 *               status:
 *                 type: string
 *                 enum: [new, in-progress, resolved]
 *                 description: The updated ticket status
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: The updated ticket priority
 *               botResponse:
 *                 type: string
 *                 description: The updated bot response
 *     responses:
 *       200:
 *         description: The ticket was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       404:
 *         description: The ticket was not found
 *   delete:
 *     summary: Delete a ticket by id
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The MongoDB ObjectId of the ticket
 *     responses:
 *       200:
 *         description: The ticket was deleted
 *       404:
 *         description: The ticket was not found
 */
router
  .route('/:id')
  .get(protect, getTicket)
  .put(protect, updateTicket)
  .delete(protect, deleteTicket);

/**
 * @swagger
 * /api/tickets/{id}/messages:
 *   post:
 *     summary: Add an admin message/reply to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *         description: The MongoDB ObjectId of the ticket
 *         example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The message text from admin
 *                 example: "Hello! I've received your ticket and will help you resolve this issue."
 *               status:
 *                 type: string
 *                 enum: [new, in-progress, resolved, closed]
 *                 description: Update ticket status along with the message
 *                 example: "in-progress"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Update ticket priority along with the message
 *                 example: "high"
 *               tempId:
 *                 type: string
 *                 description: Temporary ID for real-time message tracking
 *                 example: "temp-msg-123"
 *     responses:
 *       200:
 *         description: Message added successfully and real-time notifications sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       sender:
 *                         type: string
 *                         enum: [admin, user]
 *                       time:
 *                         type: string
 *                         format: date-time
 *                       tempId:
 *                         type: string
 *       400:
 *         description: Message text is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message text is required"
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket not found"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Get all messages for a specific ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *         description: The MongoDB ObjectId of the ticket
 *         example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Message content
 *                     example: "Thank you for your inquiry. We are looking into this issue."
 *                   sender:
 *                     type: string
 *                     enum: [admin, user]
 *                     description: Who sent the message
 *                     example: "admin"
 *                   time:
 *                     type: string
 *                     format: date-time
 *                     description: When the message was sent
 *                     example: "2023-12-01T10:30:00.000Z"
 *                   tempId:
 *                     type: string
 *                     description: Temporary ID for real-time tracking
 *                     example: "temp-msg-123"
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket not found"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Add a message to a ticket (admin reply)
router.post('/:id/messages', protect, addTicketMessage);

// Get all messages for a ticket
router.get('/:id/messages', protect, getTicketMessages);

/**
 * @swagger
 * /api/tickets/{id}/user-message:
 *   post:
 *     summary: Add a user message to a ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: ObjectId
 *         description: The MongoDB ObjectId of the ticket
 *         example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The message text from user
 *                 example: "I tried your suggestion but I'm still having the same issue. Could you please help me further?"
 *               tempId:
 *                 type: string
 *                 description: Temporary ID for real-time message tracking
 *                 example: "temp-msg-456"
 *     responses:
 *       200:
 *         description: User message added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       sender:
 *                         type: string
 *                         enum: [admin, user]
 *                       time:
 *                         type: string
 *                         format: date-time
 *                       tempId:
 *                         type: string
 *       400:
 *         description: Message text is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Message text is required"
 *       403:
 *         description: Not authorized to message this ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not authorized to message this ticket"
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ticket not found"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Add a message to a ticket (user message)
router.post('/:id/user-message', protect, addUserTicketMessage);

export default router; 