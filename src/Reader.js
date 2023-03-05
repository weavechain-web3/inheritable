import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";
import { keccak512 } from 'js-sha3'
import { binary_to_base58, base58_to_binary } from 'base58-js'
import WeaveHash_abi from "./WeaveHash_abi.json";
import Inheritance_abi from "./Inheritance_abi.json";
import mermaid from "mermaid";
import Form from './components/form';

import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import {coinbaseWallet} from "./Writer";

const Buffer = require("buffer").Buffer

const sideChain = "https://public2.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";

const authChain = "base";

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance2";

const digest = "Keccak-512";

const gasPrice = 1000; //saving tokens. It seems any gas price will work (for now) as the netowrk is not used

const CHAIN_ID = "0x14A33"; //base testnet
const HASH_CONTRACT_ADDRESS = "0xB46459Cf87f1D6dDcf8AABDd5642cf27a39CeC68";
//const CHAIN_ID = "0x1A4"; //optimism testnet
//const HASH_CONTRACT_ADDRESS = "0xB46459Cf87f1D6dDcf8AABDd5642cf27a39CeC68";
//const CHAIN_ID = "0x13881"; //polygon testnet
//const HASH_CONTRACT_ADDRESS = "0xa6cC2c2521af849166D3c9657b5511fD74Cd1C91";

const CONTRACT_ADDRESS = "0xc2CA9937fCbd04e214965fFfD3526045aba337CC";

const SHOW_WITHDRAW = false;

const CHAIN = {
    chainId: CHAIN_ID,
    chainName: "Base Goerli Testnet",
    nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
    },
    rpcUrls: ["https://goerli.base.org"],
    blockExplorerUrls: ["https://goerli.basescan.org/"],
};

const CHAIN_URL = "https://goerli.base.org";

const ethereum = coinbaseWallet.makeWeb3Provider(CHAIN_URL, CHAIN_ID);
window.ethereum = ethereum;


class Reader extends Component {
    constructor(props) {
        super(props);

        let publicKey = null;
        let privateKey = null;
        if (true) {
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
            claim: "",
            qty: 0.0,
            salt: "salt1234",
            success: false,
            claimHash: "",
            flowChart: "",
            message: null,
            error: null,
            receivedClaim: null,
            receivedQty: null
        };

        this.mermaidRef = React.createRef();

        this.loadWeb3().then(async () => {
        });
    }

    async loadWeb3() {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            window.ethereum.enable();
        }
    }

    async getCurrentWallet() {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        return Web3.utils.toChecksumAddress(accounts[0].trim());
    }

    async connect() {
        const account = await this.getCurrentWallet();

        this.setState({ currentMetamaskAccount: account });

        //a new key is generated every time, so there is no key management needed for the consumer (which does not need to know about weavechain)
        // rights will be inherited based on the wallet ownership proof and NFT ownership (could also be payments on chain)
        const keys = WeaveHelper.generateKeys();
        const pub = keys[0];
        const pvk = keys[1];

        //This message must match what's hashed on server side, changing it here should trigger changing it also in the node
        let msg = "Please sign this message to confirm you own this wallet\nThere will be no blockchain transaction or any gas fees." +
            "\n\nWallet: " + account +
            "\nKey: " + pub;

        console.log(account)
        const sig = await ethereum.request({
            method: 'personal_sign',
            params: [msg, account]
        });

        const credentials = {
            "account": authChain + ":" + account,
            "sig": sig,
            "template": "*",
            "role": "*"
        }

        console.log(credentials)

        this.setState({
            publicKey: pub,
            privateKey: pvk,
            credentials: credentials
        });

        this.login();
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

    async readClaim() {
        //1. login. The login could be done only once if the nodeApi and session variables are kept in the component state
        const { nodeApi, session } = await this.login();
        console.log(this.state.credentials)

        const filter = null;
        const res = await nodeApi.read(session, data_collection, table, filter, WeaveHelper.Options.READ_DEFAULT_NO_CHAIN)
        console.log(res)



        if (res.data && res.data.length > 0) {
            //2. read the claim from source
            const item = res.data[0];
            console.log("Hey!")
            console.log(item)
            this.setState({
                receivedClaim: item.claim,
                receivedQty: (item.amount + "").includes(".") ? item.amount : item.amount + ".0"
            });

        }
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
        let flowChart = "";
        let claimHash = "";
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
                try {
                    await ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: CHAIN_ID }],
                    });
                } catch (switchError) {
                    try {
                        await ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [CHAIN],
                        });
                    } catch (error) {
                        console.debug(error);
                    }
                }

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

                const contract = await new window.web3.eth.Contract(WeaveHash_abi, HASH_CONTRACT_ADDRESS, { from: account });
                //console.log(contract.methods)
                const fn = contract.methods.readHashes();
                const items = await fn.call({ chainId: CHAIN_ID });
                //console.log(items)

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
                        claimHash = recordHash.substr(0, 5) + "..." + recordHash.substr(recordHash.length - 5);

                        const items = tree.split(";")
                        const levels = [];
                        for (let i in items) {
                            levels.push(items[i].split(","));
                        }
                        flowChart = "graph TD;\n";
                        for (let i = 1; i < levels.length; i++) {
                            for (let j = 0; j < levels[i].length; j++) {
                                let p = levels[i - 1][parseInt(j / 2)];
                                let c = levels[i][j];
                                p = p.substr(0, 5) + "..." + p.substr(p.length - 5);
                                c = c.substr(0, 5) + "..." + c.substr(c.length - 5);
                                const rel = p + "(" + p + ")-->" + c + "(" + c + ")";
                                flowChart += rel + "\n";
                            }
                        }
                        //console.log(levels);
                        //console.log(flowChart);

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
            success: success,
            flowChart: flowChart,
            claimHash: claimHash
        });
    }

    async withdraw() {
        const account = await this.getCurrentWallet();
        const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS, { from: account });

        const res = await contract.methods.withdraw().send({ from: account, gasPrice: gasPrice });
        console.log(res);
    }

    componentDidMount() {
    }

    render() {
        const {
            claim,
            qty,
            salt,
            merkle,
            success,
            flowChart,
            claimHash,
            message,
            error,
            receivedClaim,
            receivedQty
        } = this.state;

        if (flowChart && flowChart.length > 0) {
            setTimeout(() => {
                mermaid.init();
                mermaid.contentLoaded();
            }, 1);
        }

        return (
            <section className="text-gray-300 bg-black min-h-screen pb-32">
                <header className="items-center justify-between pt-12">
                    <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold text-gray-300">
                        Check or Verify Claim
                    </h1>
                </header>
                <div class="text-sm items-center text-center mt-6">
                    <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm">
                        <div className="flex justify-between">
                            <p className="text-zinc-500 font-bold text-left">Connected Address: </p>
                            <span className="text-zinc-300">{this.state.currentMetamaskAccount}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span className="text-zinc-500 font-bold text-left">Weavechain public key: </span>
                            <span className="text-zinc-300">{this.state.publicKey}</span>
                        </div>
                        <br />
                        <div className='flex justify-left'>
                            <a className='text-zinc-500' href={"https://goerli.basescan.org/address/0xB46459Cf87f1D6dDcf8AABDd5642cf27a39CeC68"} target={"_blank"}>Smart Contract [{HASH_CONTRACT_ADDRESS}]</a>
                        </div>

                        <div className='border border-white my-4'></div>
                        <br />

                        <p class="transition ">
                            <div className='rounded-md bg-black text-gray px-8 pt-4 flex flex-col items-start m-3'>
                                <p className='text-l py-2 font-semibold'>Input Claim Description</p>
                                <Form styling="w-full h-8" field={claim} onChangeFunc={(event) => this.setState({ claim: event.target.value })} placeholder={"description"} />
                                <p className='text-l py-2 font-semibold'>Amount to Beneficiary</p>
                                <Form styling="w-1/5 h-8 pb-1" field={qty} onChangeFunc={(event) => this.setState({ qty: event.target.value })} placeholder={"in USDC"} />
                            </div>

                            {/* <input className='border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                                type="text"
                                placeholder=""
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
                            /> */}
                            {/* <br />
                            <br />
                            <label className="text-yellow-600">Secret Salt</label>
                            &nbsp;
                            <input className='border shadow-xl border-blue-500/10 text-center' style={{ width: "100px" }}
                                type="text"
                                placeholder=""
                                value={salt}
                                onChange={(event) => this.setState({ salt: event.target.value })}
                            />
                            <br />
                            <br /> */}

                            {message ?
                                <div className="border-1 rounded-sm border-zinc-700 m-4">
                                    <div className='border border-white my-2'></div>
                                    <span className='text-white text-center text-xs whitespace-pre-line'>{message}</span>
                                </div>
                                : null}
                            {success ? <>
                                <span className='text-white text-center text-lg font-bold'>CLAIM VERIFIED</span>

                            </> : null}
                            {error ? <>
                                <span className='text-red text-center'>{error}</span>
                            </> : null}



                            {claimHash && claimHash.length > 0 ?
                                <div>
                                    <div className='border border-white my-2'></div>
                                    <label className="text-white font-lg">Your Claim Hash: </label>
                                    <span className="text-white">{claimHash}</span>
                                </div> : null}
                            <div id="mermaid0" ref={this.mermaidRef} className="mermaid">{flowChart}</div>

                            {receivedClaim != null
                                ? <div>
                                    <div className='border border-white my-2'></div>
                                    <p className='text-2xl text-zinc-400 font-bold'>Claim Retrieval Successful</p>
                                    <br></br>
                                    <p className='text-md py-2 font-semibold'>Claim description</p>
                                    <p className='text-sm font-light'>{receivedClaim}</p>
                                    <p className='text-md py-2 font-semibold'>Amount to beneficiary</p>
                                    <p className='text-sm font-light'>{receivedQty}</p>
                                </div> : null}

                            <button
                                className="px-5 py-2.5 mx-2 mt-8 text-lg font-medium text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow"
                                type="submit" onClick={() => this.connect()}>

                                Connect Wallet
                            </button>
                            &nbsp;
                            <button
                                className="px-5 py-2.5 mx-2 mt-8 text-lg font-medium text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow"
                                type="submit" onClick={() => this.readClaim()}>

                                Retrieve Your Claim
                            </button>
                            &nbsp;
                            <button
                                className="px-5 py-2.5 mx-2 mt-8 text-lg font-medium text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow"
                                type="submit" onClick={() => this.check()}>

                                Verify a Claim
                            </button>
                            &nbsp;
                            {SHOW_WITHDRAW ? <button
                                className="px-5 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md shadow"
                                type="submit" onClick={() => this.withdraw()}>

                                Withdraw
                            </button> : null}
                        </p>
                    </div>
                </div>


            </section >
        )
    }
}

export default Reader;
