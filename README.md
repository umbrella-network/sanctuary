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
