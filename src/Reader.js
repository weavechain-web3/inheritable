import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";
import { keccak512 } from 'js-sha3'
import { binary_to_base58, base58_to_binary } from 'base58-js'
const solanaWeb3 = require("@solana/web3.js");
const Buffer = require("buffer").Buffer


const sideChain = "https://public.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";

const authChain = "gnosis";

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance";

const digest = "Keccak-512";

const storageAccount = "EiG3thMCVKXKMAKD2ryQvRqx3pEb2ZxjBdRkDQ7At2na"; //The program storage account that keeps the merkle root and signature from the owner

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
            new WeaveHelper.Filter(null, null, null, null, [ "claim", "amount" ]),
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

                //3. get merkle root from solana contract
                let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("testnet"), "confirmed");
                const programAccount = new solanaWeb3.PublicKey(storageAccount);
                const accountInfo = await connection.getAccountInfo(programAccount, "confirmed");
                const data = accountInfo.data;
                //console.log(data)

                //4. check merkle root on chain matches merkle root received from node
                const hlenarr = data.slice(0, 4); //int little endian
                const hlen = hlenarr[0] + (hlenarr[1] << 8) + (hlenarr[2] << 16) + (hlenarr[3] << 24);
                const chainRootHash = new TextDecoder().decode(data.slice(4, 4 + hlen));
                //console.log(chainRootHash)
                const mlenarr = data.slice(4 + hlen, 8 + hlen); //int little endian
                const mlen = mlenarr[0] + (mlenarr[1] << 8) + (mlenarr[2] << 16) + (mlenarr[3] << 24);
                const mdata = new TextDecoder().decode(data.slice(8 + hlen, data.length));
                //console.log(mdata);
                const metadata = JSON.parse(mdata);
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
        } catch(error) {
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

        return <section>
            <header>
                <h1>
                    Checking a Claim
                </h1>
                <h1>Reader View</h1>
            </header>

            <div>
                <div>

                    <p>
                        <span>Connected MetaMask address: </span> <span className="text-gray-800"> {this.state.currentMetamaskAccount}</span>
                        <br />
                        <br />
                        <span>Weavechain public key: </span> <span className="text-gray-800">{this.state.publicKey}</span>
                        <br />
                        <span><a href={"https://explorer.solana.com/address/EiG3thMCVKXKMAKD2ryQvRqx3pEb2ZxjBdRkDQ7At2na?cluster=testnet"} target={"_blank"}>Solana Program Account {storageAccount}</a></span>
                        <br />
                        <br />

                        <label>Claim</label>
                        &nbsp;
                        <input style={{width: "600px"}}
                               type="text"
                               placeholder="0"
                               value={claim}
                               onChange={(event) => this.setState({ claim: event.target.value })}
                        />
                        <br />
                        <label>Amount</label>
                        &nbsp;
                        <input style={{width: "100px"}}
                               type="text"
                               placeholder="0"
                               value={qty}
                               onChange={(event) => this.setState({ qty: event.target.value })}
                        />
                        <br />
                        <br />
                        <label>Secret Salt</label>
                        &nbsp;
                        <input style={{width: "100px"}}
                               type="text"
                               placeholder="0"
                               value={salt}
                               onChange={(event) => this.setState({ salt: event.target.value })}
                        />
                        <br />
                        <br />
                        {message ? <>
                            <span style={{color: "green", whiteSpace: "pre-line"}}>{message}</span>
                        </> : null}
                        {success ? <>
                            <span style={{color: "red"}}>Success</span>
                            </> : null}
                        {error ? <>
                            <span style={{color: "red"}}>{error}</span>
                        </> : null}

                        <br />
                        <br />

                        <button type="submit" onClick={() => this.connect()}>Connect Wallet</button>
                        &nbsp;
                        <button type="submit" onClick={() => this.check()}>Check Claim</button>
                    </p>
                </div>
            </div>


        </section>
    }
}

export default Reader;
