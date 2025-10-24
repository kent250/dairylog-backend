# Use a lightweight Node.js image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose port 3000 for the app
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development

# Run the dev command (nodemon)
CMD ["npm", "run", "dev"]
