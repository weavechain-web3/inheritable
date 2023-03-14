/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'mz/fs';
import * as path from 'path';
import * as borsh from 'borsh';

import {getPayer, getRpcUrl, createKeypairFromFile} from './utils';

const bs58 = require('bs58')

let connection: Connection;

let payer: Keypair;

let programId: PublicKey;

let storagePubKey: PublicKey;

const PROGRAM_PATH = path.resolve(__dirname, '../../dist/program');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'inheritable.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy dist/program/inheritable.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'inheritable-keypair.json');

/**
 * The state
 */
class HashAccount {
  counter = 0;
  constructor(fields: {counter: number} | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

let RECORD_SIZE = 5; //min size

export async function establishPayer(): Promise<void> {
  let fees = 0;
  if (!payer) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    fees += await connection.getMinimumBalanceForRentExemption(RECORD_SIZE);

    fees += feeCalculator.lamportsPerSignature * 100;

    payer = await getPayer();
  }

  let lamports = await connection.getBalance(payer.publicKey);
  if (lamports < fees) {
    // If current balance is not enough to pay for fees, request an airdrop
    const sig = await connection.requestAirdrop(
      payer.publicKey,
      fees - lamports,
    );
    await connection.confirmTransaction(sig);
    lamports = await connection.getBalance(payer.publicKey);
  }

  console.log(
    'Using account',
    payer.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the inheritable BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
  // Read program id from keypair file
  try {
    const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
    programId = programKeypair.publicKey;
    console.log("Program", programId.toBase58())
  } catch (err) {
    const errMsg = (err as Error).message;
    throw new Error(
      `Failed to read program keypair at '${PROGRAM_KEYPAIR_PATH}' due to error: ${errMsg}. Program may need to be deployed with \`solana program deploy dist/program/inheritable.so\``,
    );
  }

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error(
        'Program needs to be deployed with `solana program deploy dist/program/inheritable.so`',
      );
    } else {
      throw new Error('Program needs to be built and deployed');
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);

  // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
  const SEED = '1234';
  storagePubKey = await PublicKey.createWithSeed( // data account with seed 1234
    payer.publicKey,
    SEED,
    programId,
  );

  console.log("Storage Account", storagePubKey.toBase58());

  // Check if the greeting account has already been created
  const hashAccount = await connection.getAccountInfo(storagePubKey);
  if (hashAccount === null) {
    console.log(
      'Creating account',
        storagePubKey.toBase58(),
      'to save hash to',
    );
    const lamports = await connection.getMinimumBalanceForRentExemption(
      RECORD_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        basePubkey: payer.publicKey,
        seed: SEED,
        newAccountPubkey: storagePubKey,
        lamports,
        space: RECORD_SIZE,
        programId,
      }),
    );
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }
}

export async function vote(): Promise<void> {
  console.log("\n--- VOTE\n")
  const tdata = "abq4v6kuD8z7GmE6SuiKRU1q4NH4VZCTxTdJ6URLUwrwt33UM3shXBB6NQmuKQwguwhGxgT4hvAs14YUKA8gSeHmLv3CkbBuv5w9vPxewkzuvopfv2B5zb2NTMxK698ZB6ZkQHibVAZqG59ctAbUQ5YcejnvvMkPvURNXFycMU9MVo1WZcwXG7Pz6kN8py";
  console.log('Voting to', storagePubKey.toBase58());
  console.log(new Buffer(bs58.decode(tdata)))
  const instruction = new TransactionInstruction({
    keys: [{pubkey: storagePubKey, isSigner: false, isWritable: true}],
    programId,
    data: new Buffer(bs58.decode(tdata))
  });
  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );
  console.log(sig);
}

export async function reset(): Promise<void> {
  console.log("\n--- RESET\n")

  const tdata = new Buffer([ 0 ]);
  console.log(tdata)
  const instruction = new TransactionInstruction({
    keys: [{pubkey: storagePubKey, isSigner: false, isWritable: true}],
    programId,
    data: tdata
  });
  const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(instruction),
      [payer],
  );
  console.log(sig);
}

export async function setOracles(): Promise<void> {
  console.log("\n--- SET\n")
  const tdata = "4ExRs2s5daAYCTaRRJr2oU9wY2ThJd4g3AvJ67KtQXy1G27YmeWDPRru9k6e5ArbUJx5NddyS4WJc7csry3MMW9qsCt9BxcnAymQTmQvdFUshRHg1RsuNcth8wy1HUkrx5QXsE7vER1Fmzj2h7XZLssGqg2xoLy3b8hausETY5siWJAq3CSQaK867cFXBzse2sd9hAc1SvZ";

  console.log('Setting oracles to', storagePubKey.toBase58());
  console.log(new Buffer(bs58.decode(tdata)))
  const instruction = new TransactionInstruction({
    keys: [{pubkey: storagePubKey, isSigner: false, isWritable: true}],
    programId,
    data: new Buffer(bs58.decode(tdata))
  });
  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );
  console.log(sig);
}

export async function readState(): Promise<any> {
  console.log("\n--- READ\n")
  const accountInfo = await connection.getAccountInfo(storagePubKey);
  if (accountInfo === null) {
    throw 'Error: cannot find the storage account';
  }
  console.log("Deserializing...")
  //console.log(accountInfo)


  const data = accountInfo.data;
  console.log(data)

  const oracles : any[] = [];
  const votes: any[] = [];

  let idx = 0
  const is_unlocked = data.readUInt8()
  idx += 1
  console.log("Unlocked", is_unlocked);

  const len = data.readUInt32LE(idx)
  idx += 4
  console.log("Oracles count", len);

  //console.log(len)
  for (var i = 0; i < len; i++) {
    const leno = data.readUInt32LE(idx)
    idx += 4
    const odata = data.slice(idx, idx + leno)
    idx += leno

    console.log(odata)
    oracles.push(odata.toString('utf8'));
  }

  if (idx < data.length) {
    const lenv = data.readUInt32LE(idx)
    idx += 4
    console.log("Votes count", lenv);

    //console.log(len)
    for (var i = 0; i < lenv; i++) {
      const lenw = data.readUInt32LE(idx)
      idx += 4
      const wdata = data.slice(idx, idx + lenw)
      idx += lenw

      const lens = data.readUInt32LE(idx)
      idx += 4
      const sigdata = data.slice(idx, idx + lens)
      idx += lens

      console.log(wdata)
      console.log(sigdata)
      votes.push({
        source: wdata.toString('utf8'),
        signature: sigdata.toString('utf8')
      });
    }
  }

  return new Promise((resolve) => {
    resolve({
      is_unlocked,
      oracles,
      votes
    });
  });
}
