FROM node:20-alpine

WORKDIR /app

# Copy only the built files and package files
COPY package*.json ./
COPY dist ./dist

# Install only production dependencies
RUN npm ci --only=production

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]