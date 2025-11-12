# How to Run the DairyLog Backend Application

This guide provides step-by-step instructions for setting up and running the DairyLog Backend API.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 20.x or higher ([Download Node.js](https://nodejs.org/))
- **npm**: Comes bundled with Node.js
- **PostgreSQL**: A running PostgreSQL database instance
- **Docker & Docker Compose** (Optional, for containerized setup): [Install Docker](https://docs.docker.com/get-docker/)
- **httpSMS App**: Install the [httpSMS Android App](https://httpsms.com/) and create an account for SMS notifications

---

## Method 1: Running Locally (Without Docker)

### Step 1: Clone the Repository

```bash
git clone https://github.com/kent250/dairylog-backend.git
cd dairylog-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.development
   ```

2. Open `.env.development` in your text editor and configure the following variables:

   **Database Configuration:**
   ```
   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB_NAME"
   ```

   **Server Configuration:**
   ```
   NODE_ENV=development
   SERVER_PORT=3000
   API_BASE_URL=http://localhost:3000
   ```

   **JWT Secrets (Generate secure random strings):**
   ```
   JWT_ACCESS_SECRET="your_access_token_secret_key"
   JWT_REFRESH_SECRET="your_refresh_token_secret_key"
   ```
   
   *Tip: Generate secure secrets using Node.js:*
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   **httpSMS Configuration (for SMS notifications):**
   ```
   HTTP_SMS_API_URL=https://api.httpsms.com/v1
   HTTP_SMS_API_KEY=your-api-key
   HTTP_SMS_FROM_NUMBER=+250xxxxxxx
   ```

   **Bcrypt Configuration:**
   ```
   BCRYPT_SALT_ROUNDS=12
   ```

### Step 4: Set Up the Database

Make sure your PostgreSQL server is running, then run the database migrations:

```bash
npm run db:migrate
```

This will create all the necessary tables and schema in your database.

### Step 5: Start the Development Server

```bash
npm run dev
```

The API will start running on `http://localhost:3000` (or the port you specified in `.env.development`).

You should see output similar to:
```
🚀 Server running in DEVELOPMENT mode
🌐 URL: http://localhost:3000
📡 Port: 3000
```

### Step 6: Access the API Documentation

Once the server is running, you can access the Swagger API documentation at:
```
http://localhost:3000/api-docs
```

---

## Method 2: Running with Docker (Recommended)

Docker ensures a consistent environment across different systems.

### Step 1: Clone the Repository

```bash
git clone https://github.com/kent250/dairylog-backend.git
cd dairylog-backend
```

### Step 2: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.development
   ```

2. Edit `.env.development` with your configuration (see Method 1, Step 3 for details)

### Step 3: Build and Run with Docker Compose

```bash
docker compose up
```

**Options:**
- Run in detached mode (background): `docker compose up -d`
- Rebuild the image: `docker compose up --build`
- Stop the containers: `docker compose down`

The API will be available at `http://localhost:3000`.

### Step 4: Run Database Migrations (First Time Only)

If this is your first time running the application, you need to run migrations. Open a new terminal and execute:

```bash
docker compose exec api npm run db:migrate
```

---

## Method 3: Running in Production Mode

### Step 1: Build the TypeScript Code

```bash
npm run build
```

This compiles TypeScript files into JavaScript in the `dist` directory.

### Step 2: Set Up Production Environment

Create a `.env.production` file with production-ready configurations:
```bash
cp .env.example .env.production
```

Edit `.env.production` and set:
- `NODE_ENV=production`
- Strong JWT secrets
- Production database URL
- Production CORS origins

### Step 3: Start the Production Server

```bash
npm run start:production
```

Or simply:
```bash
npm start
```

---

## Available NPM Scripts

Here are all the available commands you can run:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled production server |
| `npm run start:production` | Run server in production mode |
| `npm run start:staging` | Run server in staging mode |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code for linting errors |
| `npm run lint:fix` | Fix linting errors automatically |
| `npm run db:generate` | Generate new database migration |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

---

## Database Management

### View Database with Drizzle Studio

Drizzle Studio provides a visual interface to browse your database:

```bash
npm run db:studio
```

This will open a web interface (usually at `https://local.drizzle.studio`) where you can view and manage your data.

### Create New Migration

After modifying database schemas, generate a new migration:

```bash
npm run db:generate
```

Then apply it:

```bash
npm run db:migrate
```

---

## Testing the Application

Run the test suite:

```bash
npm run test
```

Run tests in watch mode (useful during development):

```bash
npm run test:watch
```

Generate test coverage report:

```bash
npm run test:coverage
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change the `SERVER_PORT` in your `.env` file:
```
SERVER_PORT=3001
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   # On Linux/Mac
   sudo systemctl status postgresql
   
   # Or check if it's listening
   nc -zv localhost 5432
   ```

2. Check your `DATABASE_URL` format:
   ```
   postgresql://username:password@host:port/database_name
   ```

3. Ensure the database exists:
   ```bash
   psql -U your_username -c "CREATE DATABASE your_db_name;"
   ```

### Module Not Found Errors

Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

1. Rebuild the Docker image:
   ```bash
   docker compose down
   docker compose up --build
   ```

2. View logs:
   ```bash
   docker compose logs -f api
   ```

3. Clear Docker volumes:
   ```bash
   docker compose down -v
   ```

---

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode (development/staging/production) | Yes | development |
| `SERVER_PORT` | Port for the API server | Yes | 3000 |
| `API_BASE_URL` | Base URL for the API | Yes | http://localhost:3000 |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_ACCESS_SECRET` | Secret key for access tokens | Yes | - |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Yes | - |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing | Yes | 12 |
| `HTTP_SMS_API_URL` | httpSMS API endpoint | Yes | https://api.httpsms.com/v1 |
| `HTTP_SMS_API_KEY` | Your httpSMS API key | Yes | - |
| `HTTP_SMS_FROM_NUMBER` | Phone number for sending SMS | Yes | - |
| `CORS_ORIGINS_DEVELOPMENT` | Allowed CORS origins for dev | No | http://localhost:3000 |
| `CHOKIDAR_USEPOLLING` | Enable file watching polling (Docker) | No | true |

---

## Project Structure

```
dairylog-backend/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── db/                 # Database schemas & migrations
│   ├── middlewares/        # Express middlewares
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── .env.development        # Development environment variables
├── .env.example            # Example environment file
├── compose.yaml            # Docker Compose configuration
├── Dockerfile              # Docker build instructions
├── package.json            # NPM dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── drizzle.config.ts       # Drizzle ORM configuration
```

---

## Additional Resources

- **API Documentation**: `http://localhost:3000/api-docs` (when server is running)
- **GitHub Repository**: https://github.com/kent250/dairylog-backend
- **httpSMS Documentation**: https://httpsms.com/docs
- **Drizzle ORM Documentation**: https://orm.drizzle.team/docs/overview

---

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the application logs
3. Open an issue on the [GitHub repository](https://github.com/kent250/dairylog-backend/issues)

---

**Happy Coding! 🚀**
