import app from "./app.js";
import { config } from './config/env.js';
import { AppError } from "./utils/error-utils/AppError.js";
import { ERROR_CODES } from "./utils/error-utils/errorCodes.js";

const PORT = config.port;
const HOST = '0.0.0.0';

if (!PORT) {
    throw new AppError(ERROR_CODES.SERVER_PORT_MISSING);
}


app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running in ${(config.environment ?? 'development').toUpperCase()} mode`);
    console.log(`🌐 URL: ${config.api.baseUrl}`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔒 CORS Origins: ${config.corsOrigins.join(', ')}`);
});
