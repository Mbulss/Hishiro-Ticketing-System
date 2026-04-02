# Hishiro Ticketing System - Server

This is the backend/server application for the Hishiro Ticketing System built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   FIREBASE_PROJECT_ID=your_firebase_project_id
   # Add other required environment variables
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Start the production server:
   ```bash
   npm start
   ```

## Available Scripts

- `npm run dev` - Start the development server with nodemon
- `npm start` - Start the production server

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **Firebase Admin** - Firebase integration
- **Swagger** - API documentation

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Features

- RESTful API endpoints
- Real-time communication with Socket.io
- JWT-based authentication
- MongoDB integration with Mongoose
- Firebase Admin integration
- Comprehensive API documentation 
