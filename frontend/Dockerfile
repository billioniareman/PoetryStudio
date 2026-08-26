FROM node:22-alpine

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

EXPOSE 5173

# Bind to all interfaces inside the container so Docker port mapping resolves
CMD ["npm", "run", "dev", "--", "--host"]
