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
GET /v1/blocks
```

#### Response
```
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "block-height": 22,
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
GET /v1/blocks/:id
```

#### Response
```
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "chain": "0x5a061f5e94ba7A460Ac875984e1d966854f680C7",
    "block-height": 22,
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
}
```

## Leaves
This endpoint returns a set of leaves, along with their raw values and Merkle proofs, for a given block.

#### Request
```
GET /v1/blocks/:id/leaves
```

#### Response
```
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "block-id": "507f191e810c19729de860ea",
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
