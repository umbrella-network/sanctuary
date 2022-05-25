## Status DEVELOP
[![tests](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml/badge.svg?branch=develop)](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml)

* `sanctuary-bsc-01`: ![sanctuary-bsc-01-dev](https://argocd.dev.umb.network/api/badge?name=sanctuary-bsc-01-dev&revision=true)
* `sanctuary-eth-01`: ![sanctuary-eth-01-dev](https://argocd.dev.umb.network/api/badge?name=sanctuary-eth-01-dev&revision=true)

## Status PROD

[![tests](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/umbrella-network/sanctuary/actions/workflows/tests.yml)
[![ci](https://github.com/umbrella-network/sanctuary/actions/workflows/cicd.yml/badge.svg?branch=main)](https://github.com/umbrella-network/sanctuary/actions/workflows/cicd.yml)

* `sanctuary-bsc-01`: ![sanctuary-bsc01](https://argocd.umb.network/api/badge?name=sanctuary-bsc01&revision=true)
* `sanctuary-eth-01`: ![sanctuary-eth01](https://argocd.umb.network/api/badge?name=sanctuary-eth01&revision=true)

# Description

Retrieves raw block leaves from Umbrella sidechain blocks. Displays information about the leaves and allows users to
retrieve Merkle proofs. Provides an API for retrieving block leaves and Merkle proofs.

# Setup

Install packages.

```
$ npm install
```

Setup a dotenv file (`.env`) with local configuration values. Example:

```
PORT=3000 # HTTP port the server will listen to.
REGISTRY_CONTRACT_ADDRESS=0xABCD1234
BLOCKCHAIN_PROVIDER_URL=https://kovan.infura.io/v3/:id # Leave it empty if running locally
INFLUX_URL= #Optional to connect to an existing influxDB instance. If in local development, leave this blank to use default values
```

# Commands

## Running

### Locally (Development)

```shell script
# Seed Mock Data - optional
npx tsc -p . | node ./dist/scripts/mock-seeds.js

# Scheduler
npm run start:dev:scheduler

# Worker
# BlockResolverWorker will scan for chains and for block events
npm run start:dev:worker -- --worker BlockResolverWorker
# BlockSynchronizerWorker will pull blocks data from validators
npm run start:dev:worker -- --worker BlockSynchronizerWorker

npm run start:dev:worker -- --worker ForeignChainReplicationWorker

# Server
npm run start:dev
```

### Live

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
