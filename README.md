# Hishiro Ticketing System

A modern, full-stack support ticketing system built with React, Node.js, Express, MongoDB, and Firebase.

## 🚀 Quick Start

This project consists of two main applications:

### 🖥️ Server (Backend)
- **Location**: `./server/`
- **Technology**: Node.js, Express, MongoDB, Socket.io
- **Documentation**: [Server README](./server/README.md)

### 🌐 Client (Frontend)  
- **Location**: `./client/`
- **Technology**: React, Vite, Tailwind CSS, Firebase
- **Documentation**: [Client README](./client/README.md)

## 🐳 Docker Deployment

The project includes Docker configuration for easy deployment:

```bash
# Start both applications
docker-compose up -d

# View logs
docker-compose logs -f

# Stop applications
docker-compose down
```

## 📚 API Documentation

- **Interactive Swagger UI**: `/api-docs` (when server is running)
- **Detailed API Guide**: [API Documentation](./server/API_DOCUMENTATION.md)

## 🔧 Development Setup

1. **Server Setup**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Client Setup**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## ✨ Features

- 🎫 **Ticket Management** - Create, track, and resolve support tickets
- 👥 **User Authentication** - Firebase-based authentication system
- 🔒 **Admin Dashboard** - Administrative controls and user management
- 💬 **Real-time Chat** - Socket.io powered real-time messaging
- 📱 **Responsive Design** - Modern, mobile-friendly interface
- 🔄 **Live Updates** - Real-time ticket status and message updates

## 🏗️ Architecture

```
├── client/          # React frontend application
├── server/          # Node.js backend API
├── .github/         # CI/CD workflows
└── docker-compose.yml  # Docker orchestration
```

