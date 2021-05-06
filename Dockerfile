FROM node:12-alpine
RUN apk update && apk upgrade && apk add openssl && apk add curl && apk add nano  && apk add --no-cache bash
WORKDIR /srv/app
COPY . .
RUN npm install -g nodemon
EXPOSE 3000 3001

CMD ["nodemon","--legacy-watch", "index.js"]