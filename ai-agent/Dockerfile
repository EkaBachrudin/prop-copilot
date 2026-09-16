FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
