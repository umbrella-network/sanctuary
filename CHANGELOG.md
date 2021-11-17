# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
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
- handling impossible case where block has no voters (it can potentially happen only when we redeploying sidechain)

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
- do not stuck on blocks when validators calls for data fail

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
- Mark block as failed when validator can't be reached (not exists)

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
