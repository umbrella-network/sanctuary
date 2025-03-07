# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
### Updated
- Update Makefile and github actions due to decommission of DEV environment
- Update GitHub Action to schedule reboot of Sanctuary in Production Every Day at 10:30 UTC

### Added
- GitHub Action to deploy to nonprod
### Fixed
- GitHub Action to use helm charts path

## [5.13.1] - 2025-03-03
### Changed
- change timeout for fetching blocks to 25s

## [5.13.0] - 2024-12-13
### Added
- add support for `5ire` expenses reports 
### Fixed
- Fix github actions

## [5.12.5] - 2024-11-04
### Fixed
- Fix bytes32 to string conversion

## [5.12.4] - 2024-11-04
### Added
- added more logs to tx fetcher

## [5.12.3] - 2024-11-03
### Added
- added more logs to tx fetcher

## [5.12.2] - 2024-07-25
### Fixed
- in `EvmTxsFetcher` fix case when we get error on first block and we checkpoint all blocks

## [5.12.1] - 2024-05-20
### Added
- Update Makefile and cicd actions due to Non Prod migration to Frankfurt

## [5.12.0] - 2024-04-04
### Added
- scanning setup for rootstock

## [5.11.1] - 2024-03-13
### Fixed
- fix `prevPrice` in reports

## [5.11.0] - 2024-03-13
### Updated
- include tx cost and the number of feeds updated in each tx in reports

## [5.10.7] - 2024-03-12
### Fixed
- use proper `warn` method

## [5.10.6] - 2024-03-07
### Fixed
- fix settings for blockchainScanner

## [5.10.5] - 2024-03-07
### Fixed
- reset last run for wallet scanner on error

## [5.10.4] - 2024-03-07
### Fixed
- fix caculation for last run in wallet scanner

## [5.10.3] - 2024-03-07
### Fixed
- run wallet scanner once a day

## [5.10.2] - 2024-02-15
### Fixed
- add missing wallet in report

## [5.10.1] - 2024-02-15
### Fixed
- fix labels in price history base report

## [5.10.0] - 2024-02-15
### Added
- add price history base report

## [5.9.16] - 2024-02-13
### Added
- add `linea` to list of chains

## [5.9.15] - 2024-02-13
### Fixed
- display scanner errors

## [5.9.14] - 2024-02-13
### Fixed
- exclude sender from signature count

## [5.9.13] - 2024-02-12
### Updated
- sort report data

## [5.9.12] - 2024-02-12
### Fixed
- fix report formatting

## [5.9.11] - 2024-02-12
### Fixed
- fix upserting

## [5.9.10] - 2024-02-12
### Added
- add logs

## [5.9.9] - 2024-02-12
### Fixed
- use new bank abi

## [5.9.8] - 2024-02-12
### Added
- add logs

## [5.9.7] - 2024-02-12
### Fixed
- fix fetching validators

## [5.9.6] - 2024-02-12
### Fixed
- fix counting signatures by creating service to connect signing wallet with deviation wallet

## [5.9.5] - 2024-02-12
### Fixed
- use lowercase for `UpdateTx` model

## [5.9.4] - 2024-02-12
### Added
- additional logs for API

## [5.9.3] - 2024-02-10
### Fixed
- fix ID for `PriceData`
- fix query for last saved anchor 

## [5.9.2] - 2024-02-10
### Fixed
- limit scanner by time

## [5.9.1] - 2024-02-09
### Fixed
- limit range of scanning for event in one go

## [5.9.0] - 2024-02-09
### Added
- contract scanner service
- on-chain tx scanner

### Fixed
- in `testBalanceThreshold` support case where `balance` is null/undefined (solana case) 

### Updated
- docker node to v18

### Removed
- remove `newrelic` and `statsd`

## [5.8.0] - 2023-05-29
### Removed
- replicatin for: Eth, Avax, Polygon, Arbitrum

## [5.7.2] - 2023-03-02
### Changed
- use newest ABI for arbitrum

## [5.7.1] - 2023-03-02
### Fixed
- handle error: `requested to block N after last accepted block N-1`
- fix default `scanBatchSize`
- rescan last blocks in case RPC is missing some fresh logs
- revert cached block when blockchain blocks reverts

## [5.7.0] - 2023-02-28
### Changed
- RPC calls optimisation: save last scanned block

### Fixed
- override value of `block.number` for Arbitrum, to be Arbitrum blockchain number

## [5.6.0] - 2023-02-16
### Changed
- replicate most recent block

## [5.5.0] - 2023-02-07
### Changed
- Update blocks on mongodb as soon as they are synchronized.

## [5.4.2] - 2023-02-01
- Polygon (pr for triggering prod deployment)

## [5.4.1] - 2023-01-17
- Fixed GitHub Action "CI"

### Added
- New API endpoint for L2D for pulling individual keys

## [5.4.0] - 2023-01-17
### Added
- New API endpoint for L2D for pulling individual keys

## [5.3.1] - 2023-01-04
### Fixed
- fix `scanBatchSize` for polygon
- ensure to use valid chain ABI
- cache validators, so we can have backup in case masterchain RPC fails

## [5.3.0] - 2022-11-08
### Changed
- Return active flag on GET /fcds

## [5.2.7] - 2022-10-19
### Fixed
- Upgrade BullMQ to ~2.3.2

## [5.2.6] - 2022-10-18
### Fixed
- limit number of candidates for replication to 1K blocks

## [5.2.5] - 2022-10-12
### Fixed
- change CI ethereum RPC

## [5.2.4] - 2022-10-12
### Fixed
- set jobId when scheduling workers 

## [5.2.3] - 2022-10-03
### Fixed
- use correct `nextBlockId` for sanity check in `RevertedBlockResolver`

## [5.2.2] - 2022-10-03
### Added
- Added new pub key on action: `CI`.

## [5.2.1] - 2022-10-03
### Removed
- remove deprecated action: `Sync OpenAPI Documentation to ReadMe`.

## [5.2.0] - 2022-09-20
### Added
- Full support for multichain architecture

### Changed
- Rename ForeignBlock model to BlockChainData
- Execute migrations once before scheduling workers
- Remove anchor, minter and chainAddress from Block collection
- Adjust the way how blocks are resolved and synchronized to support multichain

### Fixed
- Make jobs to run in parallel and make sure we have only one job per `chainId`

### Removed
- removed deprecated migrations

## [5.1.3] - 2022-08-30
### Changed
- Add logger when with synchronizer blocks length
- Sync newest blocks first (debugging)

## [5.1.2] - 2022-08-30
### Changed
- Add logger when with synchronizer blocks length

## [5.1.1] - 2022-08-30
### Changed
- Revert sync newest blocks first

## [5.1.0] - 2022-08-23
### Added
- Added github action to schedule daily and on demand rebooots
- support for timestamp as block ID (backwards compatible)
- detect new chain architecture and do not replicate

### Fixed
- prioritise `START_BLOCK_NUMBER` over last anchor when `calculateBlockNumberRange` for chains discovery

## [5.0.4] - 2022-08-29
### Fixed
- Sync newest blocks first

## [5.0.3] - 2022-06-20
### Fixed
- Return correct solana network name

## [5.0.2] - 2022-06-15
### Fixed
- Return correct solana network name
- Return status and network when request info for non-evm chain

## [5.0.1] - 2022-05-30
### Fixed
- typos and warnings
- queue for chain synchronization

## [5.0.0] - 2022-05-17
### Added
- Added `MAX_SIGNATURE_SEARCH_RANGE` to control the range of the search

### Changed
- Update `GET: /signatures` to throw when period is invalid.

### Fixed
- Limit participation rate in `GET: /signatures` to 2 decimal numbers
- Fix potential division by zero in `countSignatureRate`

## [4.19.1] - 2022-05-10
### Fixed
- Fixed period validation in `GET: /signatures` to limit periods up to 7 days

## [4.19.0] - 2022-05-09
### Added
- Added `GET: /signatures` to get participation rate of each voter in given interval of blocks

## [4.18.0] - 2022-05-05
### Added
- Create metrics/keys-frequency endpoint to get frequency of appearance of keys in the latest 100 blocks

## [4.17.1] - 2022-05-04
### Changed
- Updated env to pass CI tests on dev.

## [4.17.0] - 2022-05-02
### Changed
- Updated `ForeignBlockReplicator` to use `TxSender` from SDK

### Removed
- Deleted `TxSender`

## [4.16.0] - 2022-04-21
### Added
- Added retries to `SolanaForeignChainContract` for confirming solana submit transactions

### Changed
- Updated `SolanaForeignChainContract` to use buffer to hex conversions for block root

## [4.15.0] - 2022-04-20
### Changed
- Updated `TxSender` to use `GasEstimator` from SDK
- Bump `ethers` version to 5.5.1

### Removed
- Deleted `GasEstimator`

## [4.14.0] - 2022-04-18
### Added
- Enable `LastSavedBlockDeltaTime` for all chains

## [4.13.2] - 2022-04-1
### Fix
- update Solana Chain to use parallel transactions for submit and FCDs

## [4.13.1] - 2022-04-12
### Fix
- fix argument encoding for updateFirstClassData

## [4.13.0] - 2022-04-10
### Added
- Solana replication worker
- Added `LastSavedBlockDeltaTime` event to report the latest finalized block timestamp

## [4.12.4] - 2022-03-31
### Changed
- Updated `BlockLeafCountReporter` to send block ID on report.

## [4.12.3] - 2022-03-22
### Added
- Add `name` env to use `NEW_RELIC_APP_NAME`

## [4.12.2] - 2022-03-11
### Fix
- fix toString() on `undefined`

## [4.12.1] - 2022-03-11
### Added
- add logs to see more information about polygon RPC issue

## [4.12.0] - 2022-03-10
### Changed
- hide proofs when user does not provide api key

### Fixed
- Fixed an issue where status in the info endpoint would return duplicated entries

## [4.11.2] - 2022-03-09
### Fixed
- Update Git workflows when merging to main

## [4.11.1] - 2022-03-09
### Added
- log details about issue with `BlockRepository.findLatest()`

## [4.11.0] - 2022-03-07
### Changed
- updated umb toolbox sdk version to accept negative numbers
- increased default value of Arbitrum `mintBalance` `errorLimit`

## [4.10.0] - 2022-02-23
### Added
- Arbitrum replicator

## [4.9.8] - 2022-02-22
### Changed
- small improvements how `maxFeePerGas` is calculated

### Fix
- make sure `maxFeePerGas` is higher than `maxPriorityFeePerGas` when canceling tx

## [4.9.7] - 2022-02-21
### Fixed
- make sure `maxPriorityFeePerGas` is integer when canceling tx

## [4.9.6] - 2022-02-21
### Fixed
- do not scan for chains if nothing changed

## [4.9.5] - 2022-02-21
### Fixed
- make sure `maxFeePerGas` is higher than `maxPriorityFeePerGas` (polygon fix)

## [4.9.4] - 2022-02-21
### Fixed
- make sure `maxPriorityFee` is not empty for tx type 2 (polygon fix)

## [4.9.3] - 2022-02-21
### Fixed
- make sure `maxPriorityFee` is not empty for tx type 2 (polygon fix)

## [4.9.2] - 2022-02-21
### Fixed
- check latest foreign block id for proper chain

## [4.9.1] - 2022-02-16
### Changed
- Activate e2e tests in CI

### Fixed
- Do not delete/update apiKey from different owner.

## [4.9.0] - 2022-02-02
### Added
- Create metrics/voters endpoint to get each voter's vote count of given time interval
- Create restrictAccess method in AuthenticationMiddleware
- Use restrictAccess in metrics routes

## [4.8.0] - 2022-01-27
### Added
- Check if balance is enough before execute replicate blocks

## [4.7.6] - 2022-01-27
### Fixed
- fix how we're calculating `maxPriorityFee`, 
  gas provider did not return real amount, so we estimating it base on last block

## [4.7.5] - 2022-01-27
### Added
- better logs to see for which blockchain we're throwing errors

## [4.7.4] - 2022-01-27
### Added
- support for EIP-1559 for canceling tx

### Changed
- increase timeout for tx (because of Polygon)
- detect if gasPrice is too low on tx replacement and increase it

## [4.7.3] - 2022-01-27
### Added
- include `package-lock.json`

### Fixed
- fix gas estimation, when provider returns invalid `baseFeePerGas` (it was a case for Polygon)

## [4.7.2] - 2022-01-26
### Fixed
- max scan range for infura-polygon is 3,5K

## [4.7.1] - 2021-12-15
### Fixed
- Whole foreign chain balance reporting process fails if it can't fetch balance of one of them 

## [4.7.0] - 2021-11-02
### Added
- reporting balances for validators and replicators

## [4.6.1] - 2021-11-25
### Fixed
- BlockSynchronizerWorker thundering herd.

## [4.6.0] - 2021-11-17
### Added
- Auth0 Authentication
- Profile API
- Metrics middleware

### Removed
- DB-based authentication
- Auth routes
- WalletAuth

## [4.5.0] - 2021-11-17
### Added
- Avalanche replicator (avax)

## [4.4.0] - 2021-11-08
### Added
- Swagger API Documentation on `/docs` endpoint

## [4.3.1] - 2021-11-01
### Removed
- Unnecessary github actions executions

## [4.3.0] - 2021-10-25
### Added
- LeafRepository to fetch leaves keys
### Changed
- KeysController L2D data source
- KeysController FCD data source

## [4.2.1] - 2021-10-18
### Changed
- separate api usage registering from API operation

## [4.2.0] - 2021-10-15
### Changed
- include avg price in custom gas calculations

## [4.1.0] - 2021-10-13
### Added
- Polygon replicator

## [4.0.4] - 2021-10-12
### Fixed
- multi-chain check added to /proofs (OR-1050);
- multi-chain check added to /leaves (OR-1060);

## [4.0.3] - 2021-10-11
### Fixed 
- revert blocks for valid blockchain
- use proper time for resolving block for replication

## [4.0.2] - 2021-10-07
### Added
- add support for squashed root

### Fixed
- ensure that when we have issue with processing events while resolving blocks, it does not halt whole process

## [4.0.1] - 2021-10-01
### Changed
- default max gas price 150Gwei
- increase priority fee by 10% 

### Fixed
- use replicator address as minter for foreign chain

## [4.0.0] - 2021-09-29
### Added
- v1 of multichain support
- `ForeignChainReplicationWorker` worker for multichain solution

### Changed
- moved statsD from being directly used to being injected
- API accept `chainId`

### Fixed
- Redis queue

## [3.1.5] - 2021-09-03
### Changed
- update ethers and toolbox

## [3.1.3] - 2021-09-03
### Removed 
- remove debug logs

## [3.1.3] - 2021-09-03
### Added
- logs for block from mongo

## [3.1.2] - 2021-08-19
### Changed
- handling impossible case where block has no voters (it can potentially happen only when redeploying sidechain)

## [3.1.1] - 2021-08-11
### Changed
- use SDK v4.0.1

## [3.1.0] - 2021-08-10
### Added
- monitor number of l2d pairs

## [3.0.0] - 2021-08-07
### Added
- add influxDB to save API Key usage
- /usage-metrics endpoint for API usage histogram

### Changed
- `ValidatorRegistry` becomes `StakingBank`

## [2.1.0] - 2021-07-27
### Added
- add starting block number for scanning for `Chain`

### Changed
- Support array of blocks returned from validators

## [2.0.2] - 2021-07-14
### Changed
- speed up worker by checking if there are block to sync in db instead of waiting for new minted block

## [2.0.1] - 2021-07-13
### Added
- Add SANDBOX workflow

## [2.0.0] - 2021-06-29
### Added
- add support for `FIXED` type

### Fixed
- Ensure `ChainSynchronizer` not scanning same blocks multiple times

## [1.2.5] - 2021-06-17
### Fixed
- Fix `ChainSynchronizer` and `NewBlocksResolver` batch pulls

## [1.2.4] - 2021-06-17
### Fixed
- worker's jobs are now deleted from redis when completed
- github action to force usage of main branch for the deployment to prod
  
## [1.2.3] - 2021-06-16
### Fixed
- ensure we collect FCDs correctly

## [1.2.2] - 2021-06-14
### Fixed
- ensure that job errors do not break setting up intervals

## [1.2.1] - 2021-06-10
### Fixed
- revert `/fcds` endpoint because FE uses it
- do not save empty FCDs

## [1.2.0] - 2021-06-10

### Added
- added reporting of synchronization errors to NewRelic
  
### Changed
- use FCD keys from feeds to synchronize data from blockchain

### Removed
- remove consensus data from validator response type

## [1.1.3] - 2021-06-04
### Added
- report errors to NewRelic

### Changed
- clean up debugging code
- execute migrations once before scheduling workers

### Fixed
- verify block for required fields

## [1.1.2] - 2021-06-04
### Added
- more logs for sync worker

## [1.1.1] - 2021-06-04
### Added
- logs for sync worker

## [1.1.0] - 2021-06-04

### Added
- `BlockResolverWroker`
- db migrations
- retries on timeout
- do first call for leaves to block minter

### Changed
- pull consensus data from blockchain

### Fixed
- prevent getting stuck on blocks when validators call for data fail

## [1.0.1] - 2021-05-25
### Changed
- make `/fcds` endpoint public (no key check)
- Improve tests execution and cleanup
- Ensure Prod build is not executed if tests failed
- Add develop workflow for the E2E testing (SDK and Reff App)
- Add Badges for actions and Argocd

### Fixed
- turn back on API key check

## [1.0.0] - 2021-05-24

### Added
- added statsd support and reporting of controller requests
- reverting blocks

### Changed
- support storing only latest FCDs
- support optimised Chain storage
- use merkle tree from SDK

### Removed
- delete all deprecated blocks

### Fixed
- do not mark the latest block as failed right away, when can't get leaves from validators, retry when it happens
- re-check past blocks based on last saved blockId, not base on current blockId

## [0.3.3] - 2021-05-10
### Added
- Update Makefile

## [0.3.2] - 2021-05-03
### Fixed
- Mark block as failed when validator can't be reached (does not exist)

## [0.3.1] - 2021-05-03
### Added
- Add new Production git workflow

## [0.3.0] - 2021-04-01
### Added
- support for chain contract update
- support for block reverts
  
### Changed
- sync data when root is available instead of waiting for next block
- update toolbox to `^0.9.0`

## [0.2.6] - 2021-03-17
### Fixed
- do not cache `ValidatorRegistry` address, pull it from registry

## [0.2.5] - 2021-03-11
### Fixed
- github action prod workflow

## [0.2.4] - 2021-03-11
### Fixed
- linters errors

## [0.2.3] - 2021-03-11
### Fixed
- do not cache `Chain` address, pull it from registry
- fix `/info` endpoint

## [0.2.2] - 2021-03-03
### Changed
- updated package.json version

## [0.2.1] - 2021-03-03
### Changed
- bumped toolbox version

## [0.2.0] - 2021-03-02
### Added
- first class data values

### Fixed
- remove sensitive data to .env

## [0.1.0] - 2021-02-24
### Added
- initial version
- use registry to resolve contract addresses
- block padding support
- support for numeric front class data

### Changed
- use `@umb-network/toolbox` for fetching ABIs for contracts

### Fixed
- uses contract registry without async in constructor
