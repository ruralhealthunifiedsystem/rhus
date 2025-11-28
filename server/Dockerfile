# Use the official Node image
FROM node:22

# Install LibreOffice (needed for XLSX → PDF)
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source files
COPY . .

# Ensure Node uses Koyeb's assigned port
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start your server
CMD ["node", "server/server.js"]
