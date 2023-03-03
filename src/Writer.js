import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";
import CodeEditor from "@uiw/react-textarea-code-editor";

import Inheritance_abi from "./Inheritance_abi.json";
import FiatTokenV1_abi from "./FiatTokenV1_abi.json";

const sideChain = "https://public2.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";
//const sideChain = "http://localhost:18080/92f30f0b6be2732cb817c19839b0940c";

const authChain = "base";

const gasPrice = 1000; //saving tokens. It seems any gas price will work (for now) as the netowrk is not used

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance2";

const CHAIN_ID = "0x14A33"; //base testnet
const CONTRACT_ADDRESS = "0x95bf3fc55aB20b4Dfc46EA20f9233D07038a6515";

const TOKEN_ADDRESS = "0xf26490E8bdFfa5EBE8625Bafa967560303D802E4";

const DECIMALS = 6;

const { ethereum } = window;


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
            publicKey = "weave283zqhDkng9jjQvTrWhmodR8R32QR1WV1w65jysGyefDC";
            privateKey = "FnJJikMtRXC3LvLi7hpGn5srPRmrecHNz5mWbzgpkxJb";
        }

        this.state = {
            currentMetamaskAccount: null,
            publicKey: publicKey,
            privateKey: privateKey,
            producerIndex: 0,
            credentials: null,
            saved: false,
            wallet: null,
            oracle_1: "0x6fe441c26fC6a9Efaca6A16BB4B195a41d1138c8",
            oracle_2: "0x95F453718C4f8b73d6C7CCc9Df1ad4bdF40286A6",
            oracle_3: "0x1bC466cB75a831eB10E00bC67f0Fa82d3Df1b95D",
            claim_1: "John Doe, son, with last 4 SSN digits 1234, 1 House in Palm Beach",
            qty_1: 100,
            wallet_1: "0x6fe441c26fC6a9Efaca6A16BB4B195a41d1138c8",
            claim_2: "Jane Doe, daughter, with last 4 SSN digits 5678, Fiat USD",
            qty_2: 200,
            wallet_2: "0x111112345",
            claim_3: "George Doe, nephew, with last 4 SSN digits 4567, Fiat USD",
            qty_3: 300,
            wallet_3: "0x222212345",
            claim_4: "Mary Doe, niece, with last 4 SSN digits 7654, Fiat USD",
            qty_4: 400,
            wallet_4: "0x333312345",
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

        const permissions = await ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{
                eth_accounts: {},
            }]
        });
        const account = await this.getCurrentMetamaskAccount();
        this.setState({ currentMetamaskAccount: account });

        //This message must match what's hashed on server side, changing it here should trigger changing it also in the node
        let msg = "Please sign this message to confirm you own this wallet\nThere will be no blockchain transaction or any gas fees." +
            "\n\nWallet: " + account +
            "\nKey: " + pub;

        const sig = await ethereum.request({
            method: 'personal_sign',
            params: [account, msg]
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
        } = this.state;

        //1. login. The login could be done only once if the nodeApi and session variables are kept in the component state
        const { nodeApi, session } = await this.login();

        const layout = {
            "columns": {
                "id": {"type": "LONG", "isIndexed": true, "isUnique": true, "isNullable": false},
                "ts": {"type": "LONG"},
                "pubkey": {"type": "STRING"},
                "sig": {"type": "STRING"},
                "roles": {"type": "STRING"},
                "claim": {"type": "STRING"},
                "amount": {"type": "DOUBLE"}
            },
            "idColumnIndex": 0,  // Autogenerates IDs
            "timestampColumnIndex": 1, // Fills the column automatically with the network time
            "ownerColumnIndex": 2, // Fills the pubkey column automatically with the public key of the writer
            "signatureColumnIndex": 3, // Fills the column with an EdDSA signature of the record hash
            "allowedRolesColumnIndex": 4,
            "isLocal": false,
            "applyReadTransformations": true
        };

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
                "writer," + authChain + ":" + wallet_1 + "&fn:" + authChain + ":" + CONTRACT_ADDRESS + ":Unlocked" ,
                claim_1,
                qty_1
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_2 + "&fn:" + authChain + ":" + CONTRACT_ADDRESS + ":Unlocked" ,
                claim_2,
                qty_2
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_3 + "&fn:" + authChain + ":" + CONTRACT_ADDRESS + ":Unlocked" ,
                claim_3,
                qty_3
            ],
            [
                null,
                null,
                null,
                null,
                "writer," + authChain + ":" + wallet_4 + "&fn:" + authChain + ":" + CONTRACT_ADDRESS + ":Unlocked" ,
                claim_4,
                qty_4
            ]
        ];
        const records = new WeaveHelper.Records(table, items);
        const resWrite = await nodeApi.write(session, data_collection, records, WeaveHelper.Options.WRITE_DEFAULT)
        //console.log(resWrite)

        //3. check merkle tree
        const resMerkle = await nodeApi.merkleTree(session, data_collection, table
            , new WeaveHelper.Filter(null, null, null, null, [ "claim", "amount" ])
            , "salt1234"
            , "Keccak-512"
            , WeaveHelper.Options.READ_DEFAULT_NO_CHAIN
        );
        console.log(resMerkle);

        let accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        const account = Web3.utils.toChecksumAddress(accounts[0]);
        console.log(account)


        const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS, { from: account });
        const feeToken = await new window.web3.eth.Contract(FiatTokenV1_abi, TOKEN_ADDRESS, { from: account });

        const res = await contract.methods.setOracles([
            this.state.oracle_1,
            this.state.oracle_2,
            this.state.oracle_3
        ]).send({ chainId: CHAIN_ID, gasPrice: gasPrice });
        console.log(res)
        console.log(await contract.methods.Oracles(0).call())

        /*
        const wallets = [ wallet_1, wallet_2, wallet_3, wallet_4 ];
        const amounts = [ qty_1, qty_2, qty_3, qty_4 ];
        let sum = 0;
        for (let i = 0; i < amounts.length; i++) {
            const amount = amounts[i];
            sum = sum + Math.max(0, amount)
        }
        const approve = await feeToken.methods.approve(TOKEN_ADDRESS, sum * Math.pow(10, DECIMALS)).send({ from: account, gasPrice: gasPrice });
        console.log(approve);

        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const amount = amounts[i];

            //TODO: pack this as a single call in a smart contract
            if (amount > 0) {

                const res = await contract.methods.lock(wallet, amount * Math.pow(10, DECIMALS)).send({chainId: CHAIN_ID, gasPrice: gasPrice});
                console.log(res)
            }
        }
         */

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

        return <div className="text-gray-300 bg-zinc-800 min-h-screen pb-32">
            <header className="items-center justify-between pt-12">
                <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold font-mono text-gray-300">
                    Writing a Will
                </h1>
                <h1 className="mx-auto text-center m-2 text-2xl font-medium font-mono text-gray-300 underline decoration-gray-500">
                    Writer View
                </h1>
            </header>

            <div class="text-sm items-center text-center mt-6">
                <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm border shadow-xl border-blue-500/10">
                    <span className="text-yellow-600">Connected MetaMask address: </span> <span className="text-gray-300"> {this.state.currentMetamaskAccount}</span>
                    <br />
                    <br />
                    <span className="text-teal-600">Weavechain public key: </span> <span className="text-gray-300">{this.state.publicKey}</span>
                    <br />
                    <br />
                    <span className="text-gray-300">___</span>
                    <br />
                    <br />
                    <div>Please introduce the oracles</div>
                    <br />
                    <label className="text-yellow-600">Oracle #1</label>
                    &nbsp;
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "600px"}}
                           type="text"
                           placeholder=""
                           value={oracle_1}
                           onChange={(event) => this.setState({ oracle_1: event.target.value })}
                    />
                    <br />
                    <label className="text-yellow-600">Oracle #2</label>
                    &nbsp;
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "600px"}}
                           type="text"
                           placeholder=""
                           value={oracle_2}
                           onChange={(event) => this.setState({ oracle_2: event.target.value })}
                    />
                    <br />
                    <label className="text-yellow-600">Oracle #3</label>
                    &nbsp;
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "600px"}}
                           type="text"
                           placeholder=""
                           value={oracle_3}
                           onChange={(event) => this.setState({ oracle_3: event.target.value })}
                    />
                    <br />

                    <br />
                    <br />
                    <div>Please introduce the will items</div>
                    <br />

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
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "400px"}}
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
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "400px"}}
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
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "400px"}}
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
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{width: "400px"}}
                           type="text"
                           placeholder=""
                           value={wallet_4}
                           onChange={(event) => this.setState({ wallet_4: event.target.value })}
                    />
                    <br />
                    <br />

                    {!!rootHash ? <>
                        <span style={{ color: "red" }}>Success</span>
                        <br />
                        {rootHash}
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
                        className="px-5 py-2.5 mt-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md shadow"
                        type="submit" onClick={() => this.write()}>
                        Write
                    </button>
                </div>
            </div>
            <br />
        </div>;
    }
}

export default Writer;
