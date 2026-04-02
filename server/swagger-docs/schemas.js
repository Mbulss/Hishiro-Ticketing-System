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
 *           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *         userId:
 *           type: string
 *           description: The Firebase user ID of the ticket creator
 *           example: "firebase-uid-123"
 *         userEmail:
 *           type: string
 *           description: Email of the user who created the ticket
 *           example: "user@example.com"
 *         subject:
 *           type: string
 *           description: The ticket subject/title
 *           example: "Login issue on mobile app"
 *         message:
 *           type: string
 *           description: The detailed ticket message/description
 *           example: "I'm having trouble logging into the mobile app. The app crashes when I enter my credentials."
 *         botResponse:
 *           type: string
 *           description: The initial bot response to the ticket
 *           example: "Thank you for contacting support. We've received your login issue and will assist you shortly."
 *         status:
 *           type: string
 *           enum: [new, in-progress, resolved, closed]
 *           description: The current status of the ticket
 *           example: "new"
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: The priority level of the ticket
 *           example: "medium"
 *         category:
 *           type: string
 *           description: The category of the ticket
 *           example: "Technical Support"
 *         assignedTo:
 *           type: string
 *           description: Admin ID assigned to handle this ticket
 *           example: "admin-uid-456"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the ticket was created
 *           example: "2023-12-01T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the ticket was last updated
 *           example: "2023-12-01T15:45:00.000Z"
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the ticket was resolved
 *           example: "2023-12-02T09:15:00.000Z"
 *           
 *     User:
 *       type: object
 *       required:
 *         - uid
 *         - email
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *           description: The MongoDB ObjectId of the user
 *           example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *         uid:
 *           type: string
 *           description: The Firebase user ID
 *           example: "firebase-uid-123"
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address
 *           example: "user@example.com"
 *         username:
 *           type: string
 *           description: The user's display name
 *           example: "John Doe"
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer-not-to-say]
 *           description: The user's gender
 *           example: "male"
 *         phone:
 *           type: string
 *           description: The user's phone number
 *           example: "+1234567890"
 *         address:
 *           type: string
 *           description: The user's address
 *           example: "123 Main St, City, State 12345"
 *         photoURL:
 *           type: string
 *           format: uri
 *           description: URL to the user's profile photo
 *           example: "https://example.com/profile-photos/user123.jpg"
 *         isAdmin:
 *           type: boolean
 *           description: Whether the user has admin privileges
 *           example: false
 *         role:
 *           type: string
 *           enum: [user, agent, admin]
 *           description: The user's role in the system
 *           example: "user"
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           example: true
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: The date and time of the user's last login
 *           example: "2023-12-01T08:00:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was created
 *           example: "2023-11-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was last updated
 *           example: "2023-12-01T15:45:00.000Z"
 *           
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: ObjectId
 *           description: The MongoDB ObjectId of the message
 *         ticketId:
 *           type: string
 *           description: The ID of the ticket this message belongs to
 *         senderId:
 *           type: string
 *           description: The ID of the user who sent the message
 *         senderType:
 *           type: string
 *           enum: [user, admin, system]
 *           description: The type of sender
 *         content:
 *           type: string
 *           description: The message content
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of attachment URLs
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the message was sent
 *           
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "An error occurred"
 *         error:
 *           type: string
 *           description: Detailed error information
 *           example: "ValidationError: Email is required"
 *         status:
 *           type: integer
 *           description: HTTP status code
 *           example: 400
 *           
 *     Success:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *           description: Response data
 *           
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           description: Array of items
 *         total:
 *           type: integer
 *           description: Total number of items
 *           example: 100
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *           example: 10
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 10
 */ 