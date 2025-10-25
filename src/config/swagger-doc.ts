import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './env.js';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.1.1',
        info: {
            title: 'DairyLog API Documentation',
            version: '1.0.0',
            description:
                'Express.js + TypeScript backend server for the DairyLog app. Handles JWT authentication, farmer management, and milk collection data using driizzle and PostgreSQL.',
        },
        servers: [
            {
                url: `https://sea-lion-app-p7ri7.ondigitalocean.app/api`,
                description: 'Production server',
            },
            {
                url: `http://localhost:${config.port}/api`,
                description: 'Development server',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
