FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads

EXPOSE 8002

CMD ["node", "index.js"]
