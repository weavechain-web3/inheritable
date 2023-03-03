import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";
import { ComputeOptions } from "./weaveapi/options";
import CodeEditor from "@uiw/react-textarea-code-editor";
import StringifyWithFloats from "stringify-with-floats"
import { keccak512 } from 'js-sha3'
import { binary_to_base58, base58_to_binary } from 'base58-js'
import WeaveHash_abi from "./WeaveHash_abi.json";
const solanaWeb3 = require("@solana/web3.js");
const Buffer = require("buffer").Buffer


const sideChain = "https://public2.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";

const authChain = "optimism";

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance";

const digest = "Keccak-512";

const CHAIN_ID = "0x1A4";
const CONTRACT_ADDRESS = "0xB46459Cf87f1D6dDcf8AABDd5642cf27a39CeC68";
//const CHAIN_ID = "0x13881";
//const CONTRACT_ADDRESS = "0xa6cC2c2521af849166D3c9657b5511fD74Cd1C91";

const { ethereum } = window;

class Reader extends Component {
    constructor(props) {
        super(props);

        let publicKey = null;
        let privateKey = null;
        if (false) {
            //Keys management needs to be made by the application:
            // - keys generated only once and kept in local app storage
            // - probably the user fills personal details in the app and the keys are uploaded together with that
            // - keys are authorized to have write access from the backend, after reviewing the account (or maybe automatically? however, still to be done from the backend)

            //Sample code to generate a new key
            const keys = WeaveHelper.generateKeys();
            publicKey = keys[0];
            privateKey = keys[1];
        } else {
            publicKey = "weaveo6J6ujMckcJRcLqB4jY2WvJXmNnzWeSBkANXB8d5fRmx";
            privateKey = "6JneXkrQvQYRpUA4rBXqs7aVQWTMxQzSJgodoMmyp55Z";
        }

        this.state = {
            currentMetamaskAccount: null,
            publicKey: publicKey,
            privateKey: privateKey,
            credentials: null,
            claim: "George Doe, nephew, with last 4 SSN digits 4567, USD",
            qty: 250000.0,
            salt: "salt1234",
            success: false,
            message: null,
            error: null
        };

        this.loadWeb3().then(async () => {
        });
    }

    async loadWeb3() {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            window.ethereum.enable();
        }
    }

    async getCurrentMetamaskAccount() {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    }

    async connect() {
        const permissions = await ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{
                eth_accounts: {},
            }]
        });
        this.setState({ currentMetamaskAccount: await this.getCurrentMetamaskAccount() });

        //a new key is generated every time, so there is no key management needed for the consumer (which does not need to know about weavechain)
        // rights will be inherited based on the wallet ownership proof and NFT ownership (could also be payments on chain)
        const keys = WeaveHelper.generateKeys();
        const pub = keys[0];
        const pvk = keys[1];

        //This message must match what's hashed on server side, changing it here should trigger changing it also in the node
        let msg = "Please sign this message to confirm you own this wallet\nThere will be no blockchain transaction or any gas fees." +
            "\n\nWallet: " + this.state.currentMetamaskAccount +
            "\nKey: " + pub;

        const sig = await ethereum.request({
            method: 'personal_sign',
            params: [this.state.currentMetamaskAccount, msg]
        });

        const credentials = {
            "account": authChain + ":" + this.state.currentMetamaskAccount,
            "sig": sig,
            "template": "*",
            "role": "*"
        }

        this.setState({
            publicKey: pub,
            privateKey: pvk,
            credentials: credentials
        });
    }


    async login() {
        const pub = this.state.publicKey;
        const pvk = this.state.privateKey;

        const nodeApi = new WeaveHelper.WeaveAPI().create(WeaveHelper.getConfig(sideChain, pub, pvk));
        await nodeApi.init();
        console.log(nodeApi)
        const pong = await nodeApi.ping();
        console.log(pong)

        const session = await nodeApi.login(organization, pub, data_collection, this.state.credentials);
        console.log(session)
        console.log(session.scopes.length > 0)

        return { nodeApi, session };
    }

    async check() {
        const {
            claim,
            qty,
            salt
        } = this.state;

        //1. login. The login could be done only once if the nodeApi and session variables are kept in the component state
        const { nodeApi, session } = await this.login();

        //2. read merkle tree from source
        const resMerkle = await nodeApi.merkleTree(session, data_collection, table,
            new WeaveHelper.Filter(null, null, null, null, ["claim", "amount"]),
            salt,
            digest,
            WeaveHelper.Options.READ_DEFAULT_NO_CHAIN
        );
        console.log(resMerkle)

        this.setState({
            success: false,
            message: null,
            error: null
        });


        let message = null;
        let success = !!resMerkle?.data;
        if (!success) {
            this.setState({
                error: "No merkle tree received"
            });
        }

        try {
            if (success) {
                message = "Merkle tree received from node\n"

                const rootHash = resMerkle.data.rootHash;
                const ts = resMerkle.data.timestamp;
                const signature = resMerkle.data.signature;
                const tree = resMerkle.data.tree;

                //3. get merkle root from smart contract
                const res = await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CHAIN_ID }],
                })
                //console.log(await window.web3.eth.net.getId())
                //console.log(await window.web3.eth.getChainId())

                let accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                const account = Web3.utils.toChecksumAddress(accounts[0]);
                console.log(account)

                const contract = await new window.web3.eth.Contract(WeaveHash_abi, CONTRACT_ADDRESS, { from: account });
                //console.log(contract.methods)
                const fn = contract.methods.readHashes();
                const items = await fn.call({ chainId: CHAIN_ID });
                console.log(items)

                //4. check merkle root on chain matches merkle root received from node
                const chainRootHash = items[2];
                const metadata = JSON.parse(items[3]);
                const chainTs = metadata.ts;
                const chainRootHashSignature = metadata.signature;

                success = chainRootHash == rootHash;
                if (!success) {
                    this.setState({
                        error: "Root hash not matching on-chain value"
                    });
                } else {
                    message += "Merkle root hash matching on-chain root hash\n"

                    //5. verify the signature we have on chain
                    const resKey = await nodeApi.sigKey();
                    const sigKey = resKey.data;

                    const toSign = chainRootHash + " " + chainTs;
                    //const toSign = rootHash + " " + ts;
                    const resVerifySig = await nodeApi.verifyDataSignature(session, sigKey, chainRootHashSignature, toSign);
                    //console.log(resVerifySig)
                    success = resVerifySig.data === "true";
                    if (!success) {
                        this.setState({
                            error: "Invalid root hash signature"
                        });
                    }

                    if (success) {
                        message += "On-chain merkle root hash matching Dilithium signature\n"

                        //6. check the claim is part of the merkle tree received from the node
                        //const serialization = StringifyWithFloats({ qty: "float" }, 1)({ claim, qty });
                        const serialization = "[\"" + claim + "\"," + ((qty + "").endsWith(".0") ? qty : (qty + ".0")) + "]"; //
                        console.log(serialization);
                        const checksum = keccak512(salt + serialization);
                        const recordHash = binary_to_base58(Buffer.from(checksum, "hex"));
                        //console.log(recordHash)
                        const resVerifyTree = await nodeApi.verifyMerkleHash(session, tree, recordHash, digest);
                        console.log(resVerifyTree);

                        success = resVerifyTree.data === "true";
                        console.log(success)
                        if (!success) {
                            this.setState({
                                error: "Claim not present"
                            });
                        } else {
                            message += "Claim hash found\n" + "Validated the Merkle Tree\n"

                            this.setState({
                                message: message
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error);
            success = false;
            this.setState({
                error: "Failed checking signature"
            });
        }

        this.setState({
            success: success
        })
    }

    render() {
        const {
            claim,
            qty,
            salt,
            merkle,
            success,
            message,
            error
        } = this.state;

        return <section className="bg-zinc-800 min-h-screen pb-16">
            <header className="items-center justify-between pt-12">
                <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold font-mono text-gray-300">
                    Checking a Claim
                </h1>
                <h1 className="mx-auto text-center m-2 text-2xl font-medium font-mono text-gray-300 underline decoration-gray-500">Reader View</h1>
            </header>

            <div class="text-sm items-center text-center mt-6">
                <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm border shadow-xl border-blue-500/10">

                    <p class="transition ">
                        <span className="text-yellow-600">Connected MetaMask address: </span> <span className="text-gray-300"> {this.state.currentMetamaskAccount}</span>
                        <br />
                        <br />
                        <span className="text-teal-600">Weavechain public key: </span> <span className="text-gray-300">{this.state.publicKey}</span>
                        <br />
                        <span><a href={"https://blockscout.com/optimism/goerli/address/0xB46459Cf87f1D6dDcf8AABDd5642cf27a39CeC68"} target={"_blank"}>Smart Contract {CONTRACT_ADDRESS}</a></span>

                        <br />
                        <br />
                        <span className="text-gray-300">___</span>
                        <br />
                        <br />
                        <label className="text-yellow-600">Claim</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                            type="text"
                            placeholder="0"
                            value={claim}
                            onChange={(event) => this.setState({ claim: event.target.value })}
                        />
                        <br />
                        <label className="text-yellow-600">Amount</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={qty}
                            onChange={(event) => this.setState({ qty: event.target.value })}
                        />
                        <br />
                        <br />
                        <label className="text-yellow-600">Secret Salt</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={salt}
                            onChange={(event) => this.setState({ salt: event.target.value })}
                        />
                        <br />
                        <br />
                        {message ? <>
                            <span style={{ color: "green", whiteSpace: "pre-line" }}>{message}</span>
                        </> : null}
                        {success ? <>
                            <span style={{ color: "red" }}>Success</span>
                        </> : null}
                        {error ? <>
                            <span style={{ color: "red" }}>{error}</span>
                        </> : null}

                        <br />
                        <br />

                        <button
                            className="px-5 py-2.5 mt-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md shadow"
                            type="submit" onClick={() => this.connect()}>

                            Connect Wallet
                        </button>
                        &nbsp;
                        <button
                            className="px-5 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md shadow"
                            type="submit" onClick={() => this.check()}>

                            Check Claim
                        </button>
                    </p>
                </div>
            </div>


        </section>
    }
}

export default Reader;
