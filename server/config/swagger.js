import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hishiro Ticketing System API',
      version: '1.0.0',
      description: `
        A comprehensive API for the Hishiro Ticketing System - a modern support ticket management platform.
        
        ## Features
        - 🎫 Complete ticket management (create, read, update, delete)
        - 👥 User management with Firebase authentication
        - 🔒 Admin functionality with role-based access
        - 📊 Real-time updates with Socket.IO
        - 🔐 JWT-based authentication
        
        ## Authentication
        This API uses Firebase JWT tokens for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Status Codes
        - 200: Success
        - 201: Created
        - 400: Bad Request
        - 401: Unauthorized
        - 403: Forbidden
        - 404: Not Found
        - 500: Internal Server Error
      `,
      contact: {
        name: 'Hishiro Support Team',
        email: 'support@hishiro.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3032',
        description: 'Development server',
      },
      {
        url: 'https://e2425-wads-l4ccg2-server.csbihub.id',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase JWT token obtained after authentication'
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Not authorized, no token'
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Validation failed'
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Resource not found'
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: [],
    }],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Tickets',
        description: 'Support ticket management operations'
      },
      {
        name: 'Users',
        description: 'User management and profile operations'
      },
      {
        name: 'Admin',
        description: 'Administrative operations (admin access required)'
      }
    ]
  },
  apis: [
    join(__dirname, '../routes/*.js'),
    join(__dirname, '../controllers/*.js'),
    join(__dirname, '../swagger-docs/*.js')
  ],
};

const specs = swaggerJsdoc(options);

export { specs }; 