# Use Ubuntu base
FROM ubuntu:22.04

# Install LibreOffice & Node.js
RUN apt-get update && \
    apt-get install -y libreoffice wget curl unzip && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Copy package.json + package-lock.json
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy all source files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
