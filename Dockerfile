FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
EXPOSE 8080
CMD ["node", "src/server.js"]
