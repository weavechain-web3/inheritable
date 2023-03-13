## Quickstart

```
npm install
npm run start
```
Note: use node version 19

## Description

Inheritable is a Web3 Will solution for secure, decentralized inheritance that’s Anchored on Solana and powered by Weavechain.

Traditionally, inheritance is managed by a centralized party like a lawyer, whom estates pay to act as a trustworthy party that can declare when they're dead and distribute their assets. Inheritable decentralizes this process by building verifiable Merkle trees of claims, and then utilizing a consensus process among trusted witnesses to determine death. This process is then hardened by being anchored to the Base blockchain with Quantum-Resistant Dilithium signatures, and maintains GDPR compliance by leveraging off-chain storage.

Here’s a detailed breakdown,

1. Estates create verifiable Merkle Trees of claims that inheritors can validate against. 

2. Weavechain Anchors the hash of the Merkle Root into smart contracts on Base to give inheritors cryptographic guarantees that the Will hasn’t been tampered with.

3. Quantum-Resistant Dilithium signatures are used as well to further ensure that the will cannot be spoofed.

4. Estates identify Witnesses who make a consensus attestation to death as a replacement for a centralized lawyer. These attestations are also managed by Weavechain in a smart contract on Base.

5. GDPR compliance is maintained because Weavechain stores the raw data off-chain with the estate, so that the will can be revoked and changed if necessary.


These security features aren’t just jargon; they are essential building blocks that enable privacy-preserving verifiability. Inheritable brings these tools together to create a secure, decentralized, and trustworthy inheritance system.
