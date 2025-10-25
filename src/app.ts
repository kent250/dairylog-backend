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
    res.send('Hello, JavaScript Express Server!');
});


// Routes
app.use("/api", routes);


//GLobal Error Handler
app.use(errorHandler);


export default app;
