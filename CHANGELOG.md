# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

## [1.1.3] - 2021-06-04
### Added
- logs for debug all contract addresses

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
