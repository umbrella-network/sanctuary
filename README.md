## Status DEVELOP
![Umbrella network - logo](./assets/umb.network-logo.png)

[![tests](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml)
[![ci](https://github.com/umbrella-network/sanctuary/actions/workflows/cicd.yml/badge.svg?branch=main)](https://github.com/umbrella-network/sanctuary/actions/workflows/cicd.yml)

# Description

Retrieves raw block leaves from Umbrella sidechain blocks. Displays information about the leaves and allows users to
retrieve Merkle proofs. Provides an API for retrieving block leaves and Merkle proofs.

# Setup

Install packages.

```shell script
$ npm install
```

Setup a dotenv file (`.env`) with local configuration values. Example:

```shell script
cp example.env .env
```

# Docker Install

Make sure docker is installed on the machine. Check if `docker info` is available.

## Run core services (redis and MongoDB) through docker-compose

```shell script
docker-compose -f docker-compose.yml up

# run with a custom env file
docker-compose --env-file=.env -f docker-compose.yml up
```

# Commands

## Seed Mock Data - Optional

```shell script
# Seed Mock Data - optional
npx tsc -p . | node ./dist/scripts/mock-seeds.js
```

## Local Run Scheduler 

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.yml up
```

Run scheduler start script 
```shell script
npm run start:dev:scheduler
```

## Run the worker service

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.core.yml up
```

### BlockResolverWorker

Run worker start script BlockResolverWorker will scan for chains and for block events
```shell script
npm run start:worker -- --worker BlockResolverWorker

# run in the debug mode
npm run start:worker -- --worker BlockResolverWorker
```

### BlockSynchronizerWorker
Run worker BlockSynchronizerWorker will pull blocks data from validators

```shell script
npm run start:worker -- --worker BlockSynchronizerWorker

# run in the debug mode
npm run start:dev:worker -- --worker BlockSynchronizerWorker
```

### BlockSynchronizerWorker
Run worker ForeignChainReplicationWorker will replica blocks forForeign chains

```shell script
npm run start:worker -- --worker ForeignChainReplicationWorker

# run in the debug mode
npm run start:dev:worker -- --worker ForeignChainReplicationWorker
```

## Web API service
Run Web API Service start script
```shell script
npm run start

# run in the debug mode
npm run start
```

## Live
In order to run the application you should run the scheduler, the start the BlockSynchronizerWorker worker and them the server.

```shell script
npm run start:scheduler

# Worker
npm run start:worker -- --worker BlockSynchronizerWorker

# Server
npm run start
```

## Testing

### Setup

Create ./.testing.env and fill it with settings.
```shell script
echo "MONGODB_URL=mongodb://localhost:27017/sanctuary-test" >> ./.testing.env;
```

After that start the docker.
It will initialize database and control cache dependencies.
```shell script
docker-compose -f docker-compose.yml up 
```

### Unit Tests

In another terminal run the unit tests command.
```shell script
npm run test
```

### E2E Tests

In another terminal run the e2e tests command. 
At the moment the server starts to respond it will run the e2e tests. 
```shell script
npm run test:e2e
```

## Building & Releasing

First, compile the application:

```shell script
npm run bundle
```

This will create a directory with optimized JS files under `dist`.

Run the application under production via:

```shell script
$ npm run start
```

# API Reference

We document our API using swagger. Access `http://localhost:3000/docs` after the server starts to explore the available endpoints. 

# MultiChain development

## EVM compatible blockchains

Use this commit to reproduce multichain steps: 
[a5600de5631a5e226e6c53b23bcf46882f7ee240](https://github.com/umbrella-network/sanctuary/commit/a5600de5631a5e226e6c53b23bcf46882f7ee240)


# Infrastructure deployments

```shell script
# Deploy to dev
make dev

# Deploy to dev bsc
make dev-bsc

# Deploy to dev eth
make dev-eth
```
