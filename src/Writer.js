import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import WeaveHelper from "./weaveapi/helper";
import CodeEditor from "@uiw/react-textarea-code-editor";
import Claim from './components/claim';
import Form from './components/form';
import { base58_to_binary, binary_to_base58 } from "base58-js";

import Inheritance_abi from "./Inheritance_abi.json";
import FiatTokenV1_abi from "./FiatTokenV1_abi.json";
import SidebarWrapper from './components/sidebar-wrapper';
import {Buffer} from "buffer";

export const coinbaseWallet = new CoinbaseWalletSDK({
    appName: "Inheritable",
    darkMode: true
})

const useSolana = true;

const solanaWeb3 = useSolana ? require("@solana/web3.js") : null;

const sideChain = "https://public3.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";
// const sideChain = "http://localhost:17080/92f30f0b6be2732cb817c19839b0940c";

const authChain = useSolana ? "solana" : "base";

const gasPrice = 1000; //saving tokens. It seems any gas price will work (for now) as the netowrk is not used

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance3";

const CONTRACT_ADDRESS = useSolana ? "G9nmhaToGZr2ih7X24Zo72w6fYLAEYU9EMjSo5M5D3vf" : "0xc2CA9937fCbd04e214965fFfD3526045aba337CC";
const CONTRACT_STORAGE_ADDRESS = useSolana ? "J12GJcqn3WneSUS1FMqHNAoeRMWExuRpKLNXHrgSnfMk" : null;

const CHAIN_ID = "0x14A33"; //base testnet
const CHAIN_URL = "https://goerli.base.org";

const ethereum = useSolana ? null : coinbaseWallet.makeWeb3Provider(CHAIN_URL, CHAIN_ID);
window.ethereum = ethereum;

const TOKEN_ADDRESS = "0xf26490E8bdFfa5EBE8625Bafa967560303D802E4";

const DECIMALS = 6;

const STORE_AMOUNTS = false;

class Vote {
    source = null;
    signature = null;

    constructor({ source, signature }) {
        this.source = source;
        this.signature = signature;
    }
}


class Writer extends Component {
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
            if (sideChain.includes("localhost")) {
                publicKey = "weavepAxQmrPWHRDHuS9WLFjCVjE9vJ14nKQYt2V5e1qRWSCq";
                privateKey = "HPY1SCQ7nHqSUYYyKEDiMfQyjs4TAqjg9uRKgbX7Xtk7";
            } else {
                publicKey = "weave25MLCC8pqe1cMJGCjwEnNFpaKpHEt8ZGrjXqz3BjFveNL";
                privateKey = "H7Z3mUpGg2k4ZeghK1hVBmQbveSnukhGxNjofs4mvu7v";
            }
        }

        this.state = {
            currentWallet: null,
            publicKey: publicKey,
            privateKey: privateKey,
            producerIndex: 0,
            credentials: null,
            saved: false,
            wallet: null,
            oracle_1: "7oATF4u22gFYsYKfgFV7AJZRztkNCtxx71ZCGTjZg9Le",
            oracle_2: "2hvcL316EUKLCdodjifN2rYCY683tTCZkZCKKew9MsRv",
            oracle_3: "2hvcL316EUKLCdodjifN2rYCY683tTCZkZCKKew9MsRv",
            claim_1: "John Doe, son, with last 4 SSN digits 1234, 1 House in Palm Beach",
            qty_1: 100,
            wallet_1: "7oATF4u22gFYsYKfgFV7AJZRztkNCtxx71ZCGTjZg9Le",
            claim_2: "Jane Doe, daughter, with last 4 SSN digits 5678, Fiat USD",
            qty_2: 200,
            wallet_2: "2hvcL316EUKLCdodjifN2rYCY683tTCZkZCKKew9MsRv",
            claim_3: "George Doe, nephew, with last 4 SSN digits 4567, Fiat USD",
            qty_3: 300,
            wallet_3: "2hvcL316EUKLCdodjifN2rYCY683tTCZkZCKKew9MsRv",
            claim_4: "Mary Doe, niece, with last 4 SSN digits 7654, Fiat USD",
            qty_4: 400,
            wallet_4: "2hvcL316EUKLCdodjifN2rYCY683tTCZkZCKKew9MsRv",
        };

        if (!useSolana) {
            this.loadWeb3().then(async () => {
            });
        }
    }

    async loadWeb3() {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            window.ethereum.enable();
        }
    }

    async getCurrentWallet() {
        if (useSolana) {
            const response = await window.solana.connect();
            return response.publicKey.toString();
        } else {
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});
            return Web3.utils.toChecksumAddress(accounts[0].trim());
        }
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

    async connect() {
        const pub = this.state.publicKey;
        const pvk = this.state.privateKey;

        const account = await this.getCurrentWallet();
        this.setState({ currentWallet: account });

        //This message must match what's hashed on server side, changing it here should trigger changing it also in the node
        let msg = "Please sign this message to confirm you own this wallet\nThere will be no blockchain transaction or any gas fees." +
            "\n\nWallet: " + account +
            "\nKey: " + pub;

        const sig = useSolana ? binary_to_base58((await window.solana.signMessage(new TextEncoder().encode(msg), 'utf8')).signature)
            : await ethereum.request({
                method: 'personal_sign',
                params: [msg, account]
            });

        const credentials = {
            "account": authChain + ":" + account,
            "sig": sig,
            "template": "*",
            "role": "*"
        }

        this.setState({
            publicKey: pub,
            privateKey: pvk,
            credentials: credentials,
        });
    }

    async write() {
        const {
            claim_1, qty_1, wallet_1,
            claim_2, qty_2, wallet_2,
            claim_3, qty_3, wallet_3,
            claim_4, qty_4, wallet_4,
            oracle_1, oracle_2, oracle_3
        } = this.state;

        //1. login. The login could be done only once if the nodeApi and session variables are kept in the component state
        const { nodeApi, session } = await this.login();

        const layout = {
            "columns": {
                "id": { "type": "LONG", "isIndexed": true, "isUnique": true, "isNullable": false },
                "ts": { "type": "LONG" },
                "pubkey": { "type": "STRING" },
                "sig": { "type": "STRING" },
                "roles": { "type": "STRING" },
                "claim": { "type": "STRING" },
                "amount": { "type": "DOUBLE" }
            },
            "idColumnIndex": 0,  // Autogenerates IDs
            "timestampColumnIndex": 1, // Fills the column automatically with the network time
            "ownerColumnIndex": 2, // Fills the pubkey column automatically with the public key of the writer
            "signatureColumnIndex": 3, // Fills the column with an EdDSA signature of the record hash
            "allowedRolesColumnIndex": 4,
            "isLocal": false,
            "applyReadTransformations": true
        };


        const account = await this.getCurrentWallet();
        console.log(account);

        if (useSolana) {
            function le(val) {
                const res = new Uint8Array(4);
                res[0] =  val & 0xFF;
                res[1] = (val >> 8) & 0xFF;
                res[2] = (val >> 16) & 0xFF;
                res[3] = (val >> 24) & 0xFF;
                return res;
            }

            const o1 = new TextEncoder().encode(oracle_1);
            const o2 = new TextEncoder().encode(oracle_2);
            const o3 = new TextEncoder().encode(oracle_3);
            const count = 3;

            var tdata = new Uint8Array(1 + 4 + 4 + o1.length + 4 + o2.length + 4 + o3.length);
            tdata[0] = 2; //set oracles
            tdata.set(le(count), 1);
            tdata.set(le(o1.length), 1 + 4);
            tdata.set(o1, 1 + 4 + 4);
            tdata.set(le(o2.length), 1 + 4 + 4 + o1.length);
            tdata.set(o2, 1 + 4 + 4 + o1.length + 4);
            tdata.set(le(o3.length), 1 + 4 + 4 + o1.length + 4 + o2.length);
            tdata.set(o3, 1 + 4 + 4 + o1.length + 4 + o2.length + 4);

            console.log(tdata)
            console.log(binary_to_base58(tdata));

            let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("testnet"), "confirmed");

            const accountKey = new solanaWeb3.PublicKey(account);
            const programAccount = new solanaWeb3.PublicKey(CONTRACT_ADDRESS);
            const programStorageAccount = new solanaWeb3.PublicKey(CONTRACT_STORAGE_ADDRESS);

            let transaction = new solanaWeb3.Transaction().add(
                new solanaWeb3.TransactionInstruction({
                    keys: [
                        { pubkey: programStorageAccount, isSigner: false, isWritable: true },
                        { pubkey: accountKey, isSigner: true, isWritable: false }
                    ],
                    programId: programAccount,
                    data: tdata,
                })
            );

            transaction.feePayer = await window.solana.publicKey;

            const blockhashResponse = await connection.getLatestBlockhashAndContext();
            const lastValidBlockHeight = blockhashResponse.context.slot + 150;
            let bheight = await connection.getBlockHeight();

            if (bheight < lastValidBlockHeight) {
                transaction.recentBlockhash = blockhashResponse.value.blockhash;
                let signed = await window.solana.signTransaction(transaction);
                //console.log(signed)
                const rawTransaction = signed.serialize();
                //console.log(rawTransaction)

                const res = await connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: true,
                });
                console.log("Transaction Hash", res)

                //retry
                //bheight = await connection.getBlockHeight();
            }
        } else {
            const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS, {from: account});
            const feeToken = await new window.web3.eth.Contract(FiatTokenV1_abi, TOKEN_ADDRESS, {from: account});

            const res = await contract.methods.setOracles([
                oracle_1,
                oracle_2,
                oracle_3
            ]).send({chainId: CHAIN_ID, gasPrice: gasPrice});
            console.log(res)
            console.log(await contract.methods.Oracles(0).call())

            if (STORE_AMOUNTS) {
                const wallets = [wallet_1, wallet_2, wallet_3, wallet_4];
                const qty = [qty_1, qty_2, qty_3, qty_4];
                const amounts = [];
                let sum = 0;
                for (let i = 0; i < amounts.length; i++) {
                    const amount = qty[i];
                    sum = sum + Math.max(0, amount)
                    amounts.push(amount * Math.pow(10, DECIMALS));
                }
                const approveRes = await feeToken.methods.approve(TOKEN_ADDRESS, sum).send({
                    from: account,
                    gasPrice: gasPrice
                });
                console.log(approveRes);

                const lockRes = await contract.methods.lock(wallets, amounts).send({
                    chainId: CHAIN_ID,
                    gasPrice: gasPrice
                });
                console.log(lockRes)
            }
        }


        const resDrop = await nodeApi.dropTable(session, data_collection, table, WeaveHelper.Options.DROP_FAILSAFE);
        //console.log(resDrop)
        const resCreate = await nodeApi.createTable(session, data_collection, table, new WeaveHelper.Options.CreateOptions(false, false, layout));
        //console.log(resCreate)

        //2. write.
        const items = [
            [
                null, //_id, filled server side
                null, // timestamp
                null, // writer
                null, // signature of writer
                "writer," + authChain + ":" + wallet_1 + "&fn:" + authChain + ":" + CONTRACT_STORAGE_ADDRESS + ":0",
                claim_1,
                qty_1
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_2 + "&fn:" + authChain + ":" + CONTRACT_STORAGE_ADDRESS + ":0",
                claim_2,
                qty_2
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_3 + "&fn:" + authChain + ":" + CONTRACT_STORAGE_ADDRESS + ":0",
                claim_3,
                qty_3
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_4 + "&fn:" + authChain + ":" + CONTRACT_STORAGE_ADDRESS + ":0",
                claim_4,
                qty_4
            ]
        ];
        const records = new WeaveHelper.Records(table, items);
        const resWrite = await nodeApi.write(session, data_collection, records, WeaveHelper.Options.WRITE_DEFAULT)
        console.log(resWrite)

        //3. check merkle tree
        const resMerkle = await nodeApi.merkleTree(session, data_collection, table
            , new WeaveHelper.Filter(null, null, null, null, ["claim", "amount"])
            , "salt1234"
            , "Keccak-512"
            , WeaveHelper.Options.READ_DEFAULT_NO_CHAIN
        );
        console.log(resMerkle);

        this.setState({ rootHash: resMerkle?.data?.rootHash });

        return resMerkle;
    }

    render() {
        const {
            rootHash,
            oracle_1, oracle_2, oracle_3,
            claim_1, qty_1, wallet_1,
            claim_2, qty_2, wallet_2,
            claim_3, qty_3, wallet_3,
            claim_4, qty_4, wallet_4,
        } = this.state;

        return (
            <div className="text-gray-300 bg-black min-h-screen pb-32">
                <header className="items-center justify-between pt-12">
                    <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold text-gray-300">
                        Write Will
                    </h1>
                </header>

                <div class="text-sm items-center text-center mt-6">
                    <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm">
                        <div className="flex justify-between">
                            <p className="text-zinc-500 font-bold text-left">Connected Address: </p>
                            <span className="text-zinc-300">{this.state.currentWallet}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span className="text-zinc-500 font-bold text-left">Weavechain public key: </span>
                            <span className="text-zinc-300">{this.state.publicKey}</span>
                        </div>

                        {/* <label className="text-yellow-600">Oracle #1</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={oracle_1}
                            onChange={(event) => this.setState({ oracle_1: event.target.value })}
                        />
                        <br />
                        <label className="text-yellow-600">Oracle #2</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={oracle_2}
                            onChange={(event) => this.setState({ oracle_2: event.target.value })}
                        />
                        <br />
                        <label className="text-yellow-600">Oracle #3</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={oracle_3}
                            onChange={(event) => this.setState({ oracle_3: event.target.value })}
                        /> */}

                        <div className='border border-white my-4'></div>
                        <br />

                        <h1 className="mx-auto text-center pb-2 text-3xl font-extrabold text-gray-300">
                            Enscribe Will Items
                        </h1>

                        <Claim itemNo={1}
                            field1={claim_1} field2={qty_1} field3={wallet_1}
                            onChange1={(event) => this.setState({ claim_1: event.target.value })}
                            onChange2={(event) => this.setState({ qty_1: event.target.value })}
                            onChange3={(event) => this.setState({ wallet_1: event.target.value })}
                        />

                        <Claim itemNo={2}
                            field1={claim_2} field2={qty_2} field3={wallet_2}
                            onChange1={(event) => this.setState({ claim_2: event.target.value })}
                            onChange2={(event) => this.setState({ qty_2: event.target.value })}
                            onChange3={(event) => this.setState({ wallet_2: event.target.value })}
                        />

                        <Claim itemNo={3}
                            field1={claim_3} field2={qty_3} field3={wallet_3}
                            onChange1={(event) => this.setState({ claim_3: event.target.value })}
                            onChange2={(event) => this.setState({ qty_3: event.target.value })}
                            onChange3={(event) => this.setState({ wallet_3: event.target.value })}
                        />

                        <Claim itemNo={4}
                            field1={claim_4} field2={qty_4} field3={wallet_4}
                            onChange1={(event) => this.setState({ claim_4: event.target.value })}
                            onChange2={(event) => this.setState({ qty_4: event.target.value })}
                            onChange3={(event) => this.setState({ wallet_4: event.target.value })}
                        />


                        <div className='border border-white'></div>
                        <br />

                        <h1 className="mx-auto text-center pb-2 text-3xl font-extrabold text-gray-300">
                            Enscribe Witnesses
                        </h1>

                        <div className='rounded-md bg-black text-gray px-8 py-4 flex flex-col items-start m-3'>
                            <p className='text-l pb-2 font-bold'>{`Please Input Witness Addresses`}</p>
                            <p className='text-l py-2 '>First Address</p>
                            <Form styling="w-full h-8" field={oracle_1} onChangeFunc={(event) => this.setState({ oracle_1: event.target.value })} placeholder={"Address Here"} />
                            <p className='text-l py-2 '>Second Address</p>
                            <Form styling="w-full h-8 pb-1" field={oracle_2} onChangeFunc={(event) => this.setState({ oracle_2: event.target.value })} placeholder={"Address Here"} />
                            <p className='text-l py-2 '>Third Address</p>
                            <Form styling="w-full h-8 " field={oracle_3} onChangeFunc={(event) => this.setState({ oracle_3: event.target.value })} placeholder={"Address Here"} />
                        </div>


                        {/* 
                        <label className="text-yellow-600">Claim #1</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={claim_1}
                            onChange={(event) => this.setState({ claim_1: event.target.value })}
                        />
                        <br />
                        <label>USDC Amount</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={qty_1}
                            onChange={(event) => this.setState({ qty_1: event.target.value })}
                        />
                        <br />
                        <label>Wallet</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "400px" }}
                            type="text"
                            placeholder=""
                            value={wallet_1}
                            onChange={(event) => this.setState({ wallet_1: event.target.value })}
                        />
                        <br />
                        <br />

                        <label className="text-yellow-600">Claim #2</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={claim_2}
                            onChange={(event) => this.setState({ claim_2: event.target.value })}
                        />
                        <br />
                        <label>USDC Amount</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={qty_2}
                            onChange={(event) => this.setState({ qty_2: event.target.value })}
                        />
                        <br />
                        <label>Wallet</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "400px" }}
                            type="text"
                            placeholder=""
                            value={wallet_2}
                            onChange={(event) => this.setState({ wallet_2: event.target.value })}
                        />
                        <br />
                        <br />

                        <label className="text-yellow-600">Claim #3</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={claim_3}
                            onChange={(event) => this.setState({ claim_3: event.target.value })}
                        />
                        <br />
                        <label>USDC Amount</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={qty_3}
                            onChange={(event) => this.setState({ qty_3: event.target.value })}
                        />
                        <br />
                        <label>Wallet</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "400px" }}
                            type="text"
                            placeholder=""
                            value={wallet_3}
                            onChange={(event) => this.setState({ wallet_3: event.target.value })}
                        />
                        <br />
                        <br />

                        <label className="text-yellow-600">Claim #4</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                            type="text"
                            placeholder=""
                            value={claim_4}
                            onChange={(event) => this.setState({ claim_4: event.target.value })}
                        />
                        <br />
                        <label>USDC Amount</label>
                        &nbsp;
                        <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                            type="text"
                            placeholder="0"
                            value={qty_4}
                            onChange={(event) => this.setState({ qty_4: event.target.value })}
                        />
                        <br />
                        <label>Wallet</label>
                        &nbsp;
                        <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "400px" }}
                            type="text"
                            placeholder=""
                            value={wallet_4}
                            onChange={(event) => this.setState({ wallet_4: event.target.value })}
                        />
                        <br />
                        <br /> */}


                        <div className='border border-white'></div>
                        <br />

                        <h1 className="mx-auto text-center pb-2 text-3xl font-extrabold text-gray-300">
                            Enscribe Witnesses
                        </h1>

                        <div className='rounded-md bg-black text-gray px-8 py-4 flex flex-col items-start m-3'>
                            <p className='text-l pb-2 font-bold'>{`Please Input Witness Addresses`}</p>
                            <p className='text-l py-2 '>First Address</p>
                            <Form styling="w-full h-8" field={oracle_1} onChangeFunc={(event) => this.setState({ oracle_1: event.target.value })} placeholder={"Address Here"} />
                            <p className='text-l py-2 '>Second Address</p>
                            <Form styling="w-full h-8 pb-1" field={oracle_2} onChangeFunc={(event) => this.setState({ oracle_2: event.target.value })} placeholder={"Address Here"} />
                            <p className='text-l py-2 '>Third Address</p>
                            <Form styling="w-full h-8 " field={oracle_3} onChangeFunc={(event) => this.setState({ oracle_3: event.target.value })} placeholder={"Address Here"} />
                        </div>

                        <button
                            className="px-5 py-2.5 mx-2 mt-8 text-lg font-medium text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow"
                            type="submit" onClick={() => this.connect()}>
                            Connect Wallet
                        </button>
                        <button
                            className="px-5 py-2.5 mx-2 mt-2 text-lg font-medium text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow"
                            type="submit" onClick={() => this.write()}>
                            Write
                        </button>

                        {!!rootHash ? <>
                            <span className='text-xl text-white font-extrabold'>WILL ENSCRIBED</span>
                            <br />
                            {rootHash}
                        </> : null}
                    </div>
                </div >
                <br />
            </div >
        );
    }
}

export default Writer;
