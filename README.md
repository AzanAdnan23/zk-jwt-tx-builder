# ZK-JWT

ZK-JWT is an application that allows for anonymous verification of JWT signatures while masking specific claims. It enables verification of JWTs from specific issuers or subsets of domains, as well as verification based on specific claims in the payload. Our core SDK comes with libraries to assist with circuit generation and utility templates for building zero-knowledge JWT applications.

## Packages Overview

ZK-JWT consists of two core packages:

### @zk-jwt/circuits

Zero-knowledge circuits for JWT verification, including RSA signature validation and anonymous domain verification. [Read more](/packages/circuits/README.md).

### @zk-jwt/helpers

TypeScript utilities for generating circuit inputs, handling JWTs, and managing public keys. [Read more](/packages/helpers/README.md).

### @zk-jwt/contracts

Solidity contracts for on-chain verification of ZK proofs. [Read more](/packages/contracts/README.md).
