
FROM node:11.10.0

WORKDIR /app

COPY . /app

RUN npm install -g yarn && yarn

EXPOSE 3000

CMD ["yarn", "dev"]