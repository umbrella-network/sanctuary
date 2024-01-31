FROM node:18-alpine
RUN apk add --no-cache bash git make g++ python3
RUN adduser -D runner
RUN mkdir -p /home/runner/app
WORKDIR /home/runner/app
COPY package*.json ./
COPY tsconfig.json ./

RUN npm install -g typescript rimraf cpx
RUN chown -R runner:runner /home/runner

USER runner
RUN npm install

COPY @types ./@types
COPY src ./src

RUN npm run build
