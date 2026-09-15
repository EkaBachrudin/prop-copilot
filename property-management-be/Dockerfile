FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 4000

ENTRYPOINT ["bash", "entrypoint.sh"]
CMD ["npm", "run", "dev"]
