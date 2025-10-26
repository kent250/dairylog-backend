import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { corsOptions } from './config/cors.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());


app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});


app.get('/', (req, res) => {
    res.send(`
    <h1>Welcome to the DairyLog Backend API!</h1>
    <p>This API provides endpoints for managing users, farmers, and milk collection records for the DairyLog application.</p>
    <p>For detailed information on available routes and how to use them, please see the <a href="/api/doc">API Documentation</a>.</p>
  `);
});


// Routes
app.use("/api", routes);


//GLobal Error Handler
app.use(errorHandler);


export default app;
