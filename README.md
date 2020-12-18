# Description

Retrieves raw block leaves from Umbrella sidechain blocks.
Displays information about the leaves and allows users to retrieve Merkle proofs.
Provides an API for retrieving block leaves and Merkle proofs.

# Setup

Install packages.

```
$ npm install
```

Setup a dotenv file (`.env`) with local configuration values. Example:

```
PORT=3000 # HTTP port the server will listen to.
BLOCKCHAIN_PRIVATE_KEY=0x123456
CHAIN_CONTRACT_ADDRESS=0x78901
REGISTRY_CONTRACT_ADDRESS=0xABCD1234
BLOCKCHAIN_PROVIDER_URL=https://kovan.infura.io/v3/:id # Leave it empty if running locally
```

# Commands

## Running Locally (Development)

```shell script
npm run start:dev
```

## Seed Mock Data

```shell script
npx tsc -p . | node ./dist/scripts/mock-seeds.js
```

## Worker

```shell script
npm run start:worker -- --worker BlockSynchronizerWorker
```

## Worker (Development)

```shell script
npm run start:dev:worker -- --worker BlockSynchronizerWorker
```

## Scheduler

```shell script
npm run start:scheduler
```

## Scheduler (Development)

```shell script
npm run start:dev:scheduler
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

## Blocks

This endpoint returns a set of blocks along with some basic information about those blocks.

### Index

#### Request

```
GET /blocks
```

#### Response

```json
[
  {
    "staked": 1000000000000000000,
    "power": 1000000000000000000,
    "voters": ["0xa5D5DaBfbB1d64A60c62f637e292DBfC22Fd8f4F"],
    "votes": {},
    "numericFcdKeys": ["eth-eur", "eth-usd"],
    "_id": "block::83",
    "height": 83,
    "__v": 1,
    "anchor": 1179,
    "timestamp": "2020-12-17T22:02:02.000Z",
    "status": "finalized",
    "minter": "0xa5D5DaBfbB1d64A60c62f637e292DBfC22Fd8f4F",
    "root": "0xf6991e5c6d1e6e3100fa8e39f9ab9c9edc9c8d6be4a561c772626448b0e64ef9"
  }
]
```

### Show

#### Request

```
GET /blocks/:id
```

#### Response

```json
{
  "data": {
    "staked": 1234,
    "power": 1234,
    "voters": [
      "0xea674fdde714fd979de3edf0f56aa9716b898ec8",
      "0x829bd824b016326a401d083b33d092293333a830",
      "0x09ab1303d3ccaf5f018cd511146b07a240c70294",
      "0xb3b7874f13387d44a3398d298b075b7a3505d8d4"
    ],
    "votes": {
      "0xA405324F4b6EB7Bc76f1964489b3769cfc71445F": 200
    },
    "numericFcdKeys": ["eth-eur", "eth-usd"],
    "_id": "block::624",
    "height": 22,
    "__v": 1,
    "anchor": 12345,
    "timestamp": "2011-10-05T14:48:00.000Z",
    "status": "finalized",
    "minter": "0xf541c3cd1d2df407fb9bb52b3489fc2aaeedd97e",
    "root": "0xf8b72d93bb187e4adad3bbb423b261eb334d1fbdbe021cb248386ad7e39da9df"
  }
}
```

## Leaves

This endpoint returns a set of leaves, along with their raw values and Merkle proofs, for a given block.

#### Request

```
GET /blocks/:block_id/leaves
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
    "_id": "leaf::block::624::aave-usd",
    "blockId": "block::624",
    "key": "aave-usd",
    "__v": 0,
    "value": "84.68"
  }
]
```

## Keys

This endpoint returns a full list of configured Merkle tree leaf keys.

#### Request

```
GET /keys
```

#### Response

```json
{
  "data": [
    {
      "id": "eth-usd",
      "name": "ETH-USD [Spot]",
      "sourceUrl": "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",
      "leafLabel": "eth-usd",
      "valuePath": "$.USD",
      "discrepancy": 0.1
    }
  ]
}
```

## Proofs

This endpoint returns the latest block height and proofs for a given set of leaf keys.

#### Request

```
GET /proofs/?keys[]=eth-usd&keys[]=uni-usd
```

#### Response

```json
{
  "data": {
    "block": {
      "staked": 1000000000000000000,
      "power": 1000000000000000000,
      "voters": ["0xa5D5DaBfbB1d64A60c62f637e292DBfC22Fd8f4F"],
      "votes": {},
      "numericFcdKeys": ["eth-eur", "eth-usd"],
      "_id": "block::83",
      "height": 83,
      "__v": 1,
      "anchor": 1179,
      "timestamp": "2020-12-17T22:02:02.000Z",
      "status": "finalized",
      "minter": "0xa5D5DaBfbB1d64A60c62f637e292DBfC22Fd8f4F",
      "root": "0xf6991e5c6d1e6e3100fa8e39f9ab9c9edc9c8d6be4a561c772626448b0e64ef9"
    },
    "keys": ["eth-usd", "uni-usd"],
    "leaves": [
      {
        "proof": [
          "0xb8def062e729cfa9912911218432bbe1452fe2e107a869598842e8eb56d509c7",
          "0x9f2e284919ed27ceb25dc6847c24fb8ae631aaf50155ee064515228940054bde",
          "0x32b45f1179b88e642617a9273fe14d8acc64348a95ebb7bee47f25437cf175cc",
          "0xbb62bdf01dd462e30412c455aa2127156a240b1ffd5c1b0e6eb18aca2e86a925"
        ],
        "_id": "leaf::block::624::eth-usd",
        "blockId": "block::624",
        "key": "eth-usd",
        "__v": 0,
        "value": "639.96"
      },
      {
        "proof": [
          "0x060e2662dd6c848fb19c5cea1ca6e6efd13c4d1041455c7eafba31e1b0137b53",
          "0x3391f2345d36ea23e57be3755d5c33324381ddd9a1784edd9e8867ac8b35b8d4",
          "0x88d03fe3e31745950a09b8f1dbde81239332e3e28aee0760f4fbbb5ff2fc2564",
          "0xbb62bdf01dd462e30412c455aa2127156a240b1ffd5c1b0e6eb18aca2e86a925"
        ],
        "_id": "leaf::block::624::uni-usd",
        "blockId": "block::624",
        "key": "uni-usd",
        "__v": 0,
        "value": "3.645"
      }
    ]
  }
}
```

## Kubectl cheats

```shell script
# set env variable
kubectl set env deployment/sanctuary-worker REGISTRY_CONTRACT_ADDRESS='0x622c7725a8D1103E44F89341A6358A0e811Df0a5' --namespace staging

kubectl scale --replicas=1 deployment/sanctuary-worker --namespace staging
```
