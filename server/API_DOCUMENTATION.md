# Hishiro Ticketing System API Documentation

## 🚀 Overview

Welcome to the **Hishiro Ticketing System API**! This is a comprehensive REST API for managing support tickets, users, and administrative functions in a modern ticketing system.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Documentation](#api-documentation)
- [Base URL](#base-url)
- [Endpoints Overview](#endpoints-overview)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Real-time Features](#real-time-features)

## 🏁 Getting Started

### Prerequisites

- Node.js 16+ 
- MongoDB
- Firebase Account (for authentication)

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start the server: `npm run dev`

## 🔐 Authentication

This API uses **Firebase JWT tokens** for authentication. All protected endpoints require an `Authorization` header:

```
Authorization: Bearer <your-firebase-jwt-token>
```

### How to get a token:
1. Register/Login through the frontend application
2. Firebase will provide a JWT token
3. Use this token in your API requests
4. Token can be found inside browser console

## 📚 API Documentation

### Interactive Documentation
Access the **Swagger UI** documentation at:
- **Development**: [http://localhost:5001/api-docs](http://localhost:5001/api-docs)
- **Production**: [https://api.hishiro.com/api-docs](https://api.hishiro.com/api-docs)

### Features of Swagger Documentation:
- 🔍 **Interactive testing** - Test endpoints directly from the browser
- 📖 **Complete schemas** - View request/response models
- 🔧 **Authentication support** - Add your Bearer token and test protected routes
- 📱 **Mobile-friendly** - Access docs from any device
- 💾 **Export options** - Download OpenAPI specification

## 🌐 Base URL

- **Development**: `http://localhost:5001`
- **Production**: `https://api.hishiro.com`

## 🛣️ Endpoints Overview

### 🎫 Tickets
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/tickets` | Get all tickets | ✅ |
| `POST` | `/api/tickets` | Create new ticket | ✅ |
| `GET` | `/api/tickets/user` | Get current user's tickets | ✅ |
| `GET` | `/api/tickets/:id` | Get specific ticket | ✅ |
| `PUT` | `/api/tickets/:id` | Update ticket | ✅ |
| `DELETE` | `/api/tickets/:id` | Delete ticket | ✅ |
| `POST` | `/api/tickets/:id/messages` | Add admin message | ✅ |
| `GET` | `/api/tickets/:id/messages` | Get ticket messages | ✅ |
| `POST` | `/api/tickets/:id/user-message` | Add user message | ✅ |

### 👥 Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/users` | Register new user | ❌ |
| `GET` | `/api/users` | Get all users (Admin) | ✅ |
| `GET` | `/api/users/me` | Get current user profile | ✅ |
| `PATCH` | `/api/users/me` | Update current user | ✅ |
| `PATCH` | `/api/users/:id` | Update user by ID (Admin) | ✅ |

### 🔒 Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/check` | Check admin status | ✅ |
| `POST` | `/api/admin/set-admin/:uid` | Grant admin privileges | ✅ |
| `POST` | `/api/admin/remove-admin/:uid` | Remove admin privileges | ✅ |

### 🧪 System
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/test` | API health check | ❌ |

## ⚡ Rate Limiting

- **Rate limit**: 100 requests per 15 minutes per IP
- **Burst limit**: 20 requests per minute
- Headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## 📊 Response Format

### Success Response
```json
{
  "data": {}, // or []
  "message": "Success message",
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### Error Response
```json
{
  "message": "Error description",
  "error": "Detailed error information",
  "status": 400,
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## ⚠️ Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

### Common Error Scenarios

#### Authentication Errors
```json
{
  "message": "Not authorized, no token",
  "status": 401
}
```

#### Validation Errors
```json
{
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 6 characters"
  ],
  "status": 400
}
```

#### Permission Errors
```json
{
  "message": "Admin access required",
  "status": 403
}
```

## 🔄 Real-time Features

The API supports real-time updates using **Socket.IO**:

### Ticket Updates
- New ticket creation
- Status changes
- Priority updates
- New messages

### Admin Notifications
- User replies
- New ticket assignments
- System alerts

### User Notifications
- Admin responses
- Ticket status updates
- Priority changes

## 📖 Usage Examples

### Create a Ticket
```javascript
const response = await fetch('/api/tickets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    subject: 'Login Issue',
    message: 'Cannot log into my account',
    userId: 'firebase-uid-123',
    botResponse: 'Thank you for contacting support',
    priority: 'medium'
  })
});
```

### Get User Tickets
```javascript
const response = await fetch('/api/tickets/user', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});
const tickets = await response.json();
```

### Add Admin Message
```javascript
const response = await fetch('/api/tickets/ticket-id/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-jwt-token'
  },
  body: JSON.stringify({
    text: 'I have reviewed your issue and will help resolve it.',
    status: 'in-progress'
  })
});
```

## 🔧 Testing

### Using Swagger UI
1. Visit `/api-docs`
2. Click "Authorize" button
3. Enter your Bearer token
4. Test any endpoint directly

### Using Postman
1. Import the OpenAPI specification from `/api-docs`
2. Set up authentication with Bearer token
3. Test endpoints with sample data

### Using cURL
```bash
# Test API health
curl -X GET http://localhost:5001/api/test

# Create a ticket
curl -X POST http://localhost:5001/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "subject": "Test Issue",
    "message": "This is a test ticket",
    "userId": "firebase-uid",
    "botResponse": "Thank you for contacting us"
  }'
```