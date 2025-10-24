import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './env.js';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.1.1',
        info: {
            title: 'Express TS API Boilerplate',
            version: '1.0.0',
            description:
                'A clean and scalable TypeScript + Express backend boilerplate with modular architecture, error handling, and testing setup.',
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
