FROM node:18-alpine

WORKDIR /app

# Copy package files and source code
COPY . .

# Remove any pre-existing node_modules (from your dev machine)
RUN rm -rf node_modules

# Install dependencies and rebuild native modules
RUN npm ci --only=production && npm rebuild sqlite3

# Create uploads directory
RUN mkdir -p uploads/client-documents

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server.js"] 