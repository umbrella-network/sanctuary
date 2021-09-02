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
npm run start:dev:worker -- --worker BlockResolverWorker
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

# API

### FCDs

#### Request

 ```
GET /fcds
 ```

#### Response

 ```json
[
  {
    "_id": "GVol-BTC-IV-28days",
    "__v": 0,
    "dataTimestamp": "2020-05-16T09:23:42.000Z",
    "value": 89.19
  }
]
```

### Keys

#### FCDs Request

```
GET /keys/fcds
```

#### Response

```json
["ETH-USD","BTC-USD"]
```

#### Layer 2 Data Keys

```
GET /keys/layer2
```

#### Response

```json
[ "GVol-BTC-IV-28days" ]
```

## Blocks

This endpoint returns a set of blocks along with some basic information about those blocks.

### Index

```
GET /blocks
```

#### Response

```json
[
  {
    "staked": "7000000000000000000",
    "power": "5000000000000000000",
    "voters": [
      "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0",
      "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C"
    ],
    "votes": {
      "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0": "2000000000000000000",
      "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C": "3000000000000000000"
    },
    "_id": "block::115237",
    "blockId": 115237,
    "__v": 1,
    "chainAddress": "0x9f3b01F0521efe0622CA0c14A0e237FdCd61cB89",
    "dataTimestamp": "2021-05-16T09:36:53.000Z",
    "root": "0xc4c3fde3ecda88791cf3a8f8e1d0f4bb1d77db6a788e6759469d556e7a28e39e",
    "status": "finalized",
    "anchor": "24867044",
    "minter": "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0"
  }
]
```

### Show

#### Request

```
GET /blocks/:blockId
```

#### Response

```json
{
  "data": {
    "staked": "7000000000000000000",
    "power": "5000000000000000000",
    "voters": [
      "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0",
      "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C"
    ],
    "votes": {
      "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0": "2000000000000000000",
      "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C": "3000000000000000000"
    },
    "_id": "block::115237",
    "blockId": 115237,
    "__v": 1,
    "chainAddress": "0x9f3b01F0521efe0622CA0c14A0e237FdCd61cB89",
    "dataTimestamp": "2021-05-16T09:36:53.000Z",
    "root": "0xc4c3fde3ecda88791cf3a8f8e1d0f4bb1d77db6a788e6759469d556e7a28e39e",
    "status": "finalized",
    "anchor": "24867044",
    "minter": "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0"
  }
}
```

## Leaves

This endpoint returns a set of leaves, along with their raw values and Merkle proofs, for a given block.

#### Request

```
GET /blocks/:blockId/leaves
```

#### Response

```json
[
  {
    "proof": [
      "0xd2e41f59507cb0adf96a12011610284be8de6a7b9670f36df69f3505726382c7",
      "0xcdd0583f1cb502639d5087d4437b3a21b20355be2bbf7082ebe1283f8c77ee22",
      "0x90af39449c1e937a408ad7a401eb39eef589ae5193ef6095e4470447459ee6e0"
    ],
    "_id": "block::624::leaf::AAVE-USD",
    "blockId": "624",
    "key": "AAVE-USD",
    "__v": 0,
    "value": "84.68"
  }
]
```

### Proofs

This endpoint returns the latest block height and proofs for a given set of leaf keys.

#### Request

```
GET /proofs/?keys[]=ETH-USD
```

#### Response

```json
{
  "data": {
    "block": {
      "staked": "7000000000000000000",
      "power": "5000000000000000000",
      "voters": [
        "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0",
        "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C"
      ],
      "votes": {
        "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0": "2000000000000000000",
        "0xDc3eBc37DA53A644D67E5E3b5BA4EEF88D969d5C": "3000000000000000000"
      },
      "_id": "block::115241",
      "blockId": 115241,
      "__v": 1,
      "chainAddress": "0x9f3b01F0521efe0622CA0c14A0e237FdCd61cB89",
      "dataTimestamp": "2021-05-16T09:40:53.000Z",
      "root": "0x9fac1100dd3939a8c57b64c99e6eecdee5218c876ec97104e16f87227edc7461",
      "status": "finalized",
      "anchor": "24867103",
      "minter": "0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0"
    },
    "keys": [
      "ETH-USD"
    ],
    "leaves": [
      {
        "proof": [
          "0x7f587efdda07f7aae142ec3804575a9dee1af8aaeae354b3ace5f0605d4f67ed",
          "0x902643fc249442ffb5a987228c31d9bd191dbf60f854124fe1e1f1c23d47e3f5",
          "0x1eeea1e595459312fbf0be336129d35ef487866dde2e234842cddfa3654a3e57",
          "0x3e2d397b89ff9c144bc1d0af8dc0ab047cc92be94f95c51630ee709615478bf2",
          "0x68ac0fd289e870e2b75126b5755c5e540f6f56df61cd43e178e9351064fddd3d",
          "0x161ebd85d6bd6f5b9f607e7c658bd55d792c6b7d472f6dbdcc052b7a265d1a96"
        ],
        "_id": "block::115241::leaf::ETH-USD",
        "blockId": "115241",
        "key": "ETH-USD",
        "__v": 0,
        "value": "0x7b89ee01ff03"
      }
    ]
  }
}
```

## Kubectl cheats

```shell script
# Deploy to dev
make dev

# Deploy to dev bsc
make dev-bsc

# Deploy to dev eth
make dev-eth

```
