/**
 * Swagger/OpenAPI Configuration
 *
 * Generates interactive API documentation accessible at /api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Producer Tour API',
      version: '1.0.0',
      description: 'Producer Tour Royalty Management Platform API Documentation',
      contact: {
        name: 'Producer Tour Support',
        email: 'support@producertour.com'
      },
      license: {
        name: 'Proprietary',
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.producertour.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'An error occurred'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'cuid_123456'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'WRITER'],
              example: 'WRITER'
            }
          }
        },
        Statement: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'cuid_statement_123'
            },
            filename: {
              type: 'string',
              example: 'bmi-q1-2024.csv'
            },
            proType: {
              type: 'string',
              enum: ['BMI', 'ASCAP', 'SESAC', 'MLC'],
              example: 'BMI'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PUBLISHED'],
              example: 'PUBLISHED'
            },
            paymentStatus: {
              type: 'string',
              enum: ['UNPAID', 'PENDING', 'PAID'],
              example: 'UNPAID'
            },
            totalRevenue: {
              type: 'number',
              format: 'double',
              example: 1000.00
            },
            totalCommission: {
              type: 'number',
              format: 'double',
              example: 300.00
            },
            totalNet: {
              type: 'number',
              format: 'double',
              example: 700.00
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00Z'
            },
            paymentProcessedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-20T15:30:00Z'
            }
          }
        },
        PaymentSummary: {
          type: 'object',
          properties: {
            statement: {
              $ref: '#/components/schemas/Statement'
            },
            writers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
                  },
                  email: {
                    type: 'string'
                  },
                  songCount: {
                    type: 'integer'
                  },
                  grossRevenue: {
                    type: 'number'
                  },
                  commissionAmount: {
                    type: 'number'
                  },
                  netRevenue: {
                    type: 'number'
                  }
                }
              }
            },
            totals: {
              type: 'object',
              properties: {
                totalSongs: {
                  type: 'integer'
                },
                grossRevenue: {
                  type: 'number'
                },
                commissionAmount: {
                  type: 'number'
                },
                netPayment: {
                  type: 'number'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration'
      },
      {
        name: 'Statements',
        description: 'PRO statement management'
      },
      {
        name: 'Payments',
        description: 'Payment processing and exports'
      },
      {
        name: 'Users',
        description: 'User management'
      },
      {
        name: 'Writers',
        description: 'Writer profile and earnings'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
