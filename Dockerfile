# Use a lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy all files to the container
COPY . .

# Install http-server globally
RUN npm install -g http-server

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["http-server", "-p", "8080"] 