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

// Routes
app.use("/api", routes);

// Healthcheck
app.get("/health", (_req, res) => {
    const now = new Date();
    res.json({
        status: "ok",
        currentTime: now.toISOString(),
    });
});

app.get("/", (_req, res) => {
    const now = new Date();
    res.json({
        status: "ok",
        currentTime: now.toISOString(),
    });
});


//GLobal Error Handler
app.use(errorHandler);


export default app;
