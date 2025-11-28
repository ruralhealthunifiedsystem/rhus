# Use Node 22
FROM node:22

# Install LibreOffice for XLSX → PDF conversion
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy entire project
COPY . .

# Set PORT from environment (Koyeb assigns)
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start your server
CMD ["node", "server/server.js"]
