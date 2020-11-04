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
```

# Commands
## Running Locally (Development)
```
$ npm run start:dev
```

## Seed Mock Data
```
npx tsc -p . | node ./dist/scripts/mock-seeds.js
```

## Worker
```
$ npm run start:worker -- --worker BlockMintingWorker
```

## Scheduler
```
$ npm run start:scheduler
```

## Building & Releasing
First, compile the application:
```
$ npm run bundle
```

This will create a directory with optimized JS files under `dist`.

Run the application under production via:

```
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
```
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "height": 22,
      "anchor": 12345,
      "timestamp": "2011-10-05T14:48:00.000Z",
      "root": "0xf8b72d93bb187e4adad3bbb423b261eb334d1fbdbe021cb248386ad7e39da9df",
      "minter": "0xf541c3cd1d2df407fb9bb52b3489fc2aaeedd97e",
      "staked": 1234,
      "power": 1234,
      "voters": [
        "0xea674fdde714fd979de3edf0f56aa9716b898ec8",
        "0x829bd824b016326a401d083b33d092293333a830",
        "0x09ab1303d3ccaf5f018cd511146b07a240c70294",
        "0xb3b7874f13387d44a3398d298b075b7a3505d8d4"
      ]
    }
  ]
}
```

### Show
#### Request
```
GET /blocks/:id
```

#### Response
```
{
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "height": 22,
    "anchor": 12345,
    "timestamp": "2011-10-05T14:48:00.000Z",
    "root": "0xf8b72d93bb187e4adad3bbb423b261eb334d1fbdbe021cb248386ad7e39da9df",
    "minter": "0xf541c3cd1d2df407fb9bb52b3489fc2aaeedd97e",
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
    }
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
```
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "key": "prices::eth::usd",
      "value": 0xf541c3cd1d2df407fb9bb52b3489fc2aaeedd97e,
      "proof": [
        “0xd2e41f59507cb0adf96a12011610284be8de6a7b9670f36df69f3505726382c7”,
        “0xcdd0583f1cb502639d5087d4437b3a21b20355be2bbf7082ebe1283f8c77ee22”,
        “0x90af39449c1e937a408ad7a401eb39eef589ae5193ef6095e4470447459ee6e0”,
      ]
    }
  ]
}
```

## Proofs
This endpoint returns the latest block height and proofs for a given set of leaf keys.

#### Request
```
GET /proofs/?keys[]=eth-usd&keys[]=btc-eur&keys[]=uni-usd
```

#### Response
```
{
  "data": {
    "block": {
      "id": "507f1f77bcf86cd799439011",
      "height": 123
    },
    "eth-usd": {
      "value": 12345,
      "proof": [
        "0x123456",
        "0x7890123"
      ]
    },
    "btc-eur": {
      "value": 45679,
      "proof": [
        "0x890981",
        "0x9819405"
      ]
    }
  }
}
```
