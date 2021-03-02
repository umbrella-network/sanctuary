# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

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
