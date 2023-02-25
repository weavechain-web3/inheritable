import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";
import CodeEditor from "@uiw/react-textarea-code-editor";

const sideChain = "https://public.weavechain.com:443/92f30f0b6be2732cb817c19839b0940c";

const authChain = "gnosis";

const organization = "weavedemo";
const data_collection = "private";
const table = "inheritance";

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
            publicKey = "weavexUTKAe7J5faqmiq94DXXWntyRBA8bPwmrUbCtebxWd3f";
            privateKey = "FpEPgjyVeYzMSb9jJtk4uhVyoNDAo8qWuoMYPKo1dXdM";
        }

        this.state = {
            currentMetamaskAccount: null,
            publicKey: publicKey,
            privateKey: privateKey,
            producerIndex: 0,
            credentials: null,
            saved: false,
            wallet: null,
            claim_1: "John Doe, son, with last 4 SSN digits 1234, House in Palm Beach",
            qty_1: 1.0,
            claim_2: "Jane Doe, daughter, with last 4 SSN digits 5678, USD",
            qty_2: 1000000.0,
            claim_3: "George Doe, nephew, with last 4 SSN digits 4567, USD",
            qty_3: 250000.0,
            claim_4: "Mary Doe, niece, with last 4 SSN digits 7654, USD",
            qty_4: 250000.0,
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
        this.setState({ currentMetamaskAccount: await this.getCurrentMetamaskAccount() });

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
            credentials: credentials,
        });
    }

    async write() {
        const {
            claim_1, qty_1,
            claim_2, qty_2,
            claim_3, qty_3,
            claim_4, qty_4
        } = this.state;

        //1. login. The login could be done only once if the nodeApi and session variables are kept in the component state
        const { nodeApi, session } = await this.login();

        const layout = {
            "columns": {
                "id": { "type": "LONG", "isIndexed": true, "isUnique": true, "isNullable": false },
                "ts": { "type": "LONG" },
                "pubkey": { "type": "STRING" },
                "sig": { "type": "STRING" },
                "claim": { "type": "STRING" },
                "amount": { "type": "DOUBLE" }
            },
            "idColumnIndex": 0,  // Autogenerates IDs
            "timestampColumnIndex": 1, // Fills the column automatically with the network time
            "ownerColumnIndex": 2, // Fills the pubkey column automatically with the public key of the writer
            "signatureColumnIndex": 3, // Fills the column with an EdDSA signature of the record hash
            "isLocal": true,
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
                claim_1,
                qty_1
            ],
            [
                null,
                null,
                null,
                null,
                claim_2,
                qty_2
            ],
            [
                null,
                null,
                null,
                null,
                claim_3,
                qty_3
            ],
            [
                null,
                null,
                null,
                null,
                claim_4,
                qty_4
            ]
        ];
        const records = new WeaveHelper.Records(table, items);
        const resWrite = await nodeApi.write(session, data_collection, records, WeaveHelper.Options.WRITE_DEFAULT)
        //console.log(resWrite)

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
            claim_1, qty_1,
            claim_2, qty_2,
            claim_3, qty_3,
            claim_4, qty_4
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
                    <div className="text-gray-300">Please introduce the will items</div>
                    <br />

                    <label className="text-yellow-600">Claim #1</label>
                    &nbsp;
                    <input className='text-black border shadow-xl border-blue-500/10 text-center' style={{ width: "600px" }}
                        type="text"
                        placeholder="0"
                        value={claim_1}
                        onChange={(event) => this.setState({ claim_1: event.target.value })}
                    />
                    <br />
                    <label>Amount</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                        type="text"
                        placeholder="0"
                        value={qty_1}
                        onChange={(event) => this.setState({ qty_1: event.target.value })}
                    />
                    <br />
                    <br />

                    <label className="text-yellow-600">Claim #2</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                        type="text"
                        placeholder="0"
                        value={claim_2}
                        onChange={(event) => this.setState({ claim_2: event.target.value })}
                    />
                    <br />
                    <label>Amount</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                        type="text"
                        placeholder="0"
                        value={qty_2}
                        onChange={(event) => this.setState({ qty_2: event.target.value })}
                    />
                    <br />
                    <br />

                    <label className="text-yellow-600">Claim #3</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                        type="text"
                        placeholder="0"
                        value={claim_3}
                        onChange={(event) => this.setState({ claim_3: event.target.value })}
                    />
                    <br />
                    <label>Amount</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                        type="text"
                        placeholder="0"
                        value={qty_3}
                        onChange={(event) => this.setState({ qty_3: event.target.value })}
                    />
                    <br />
                    <br />

                    <label className="text-yellow-600">Claim #4</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "600px" }}
                        type="text"
                        placeholder="0"
                        value={claim_4}
                        onChange={(event) => this.setState({ claim_4: event.target.value })}
                    />
                    <br />
                    <label>Amount</label>
                    &nbsp;
                    <input className='border shadow-xl border-blue-500/10 text-center text-black' style={{ width: "100px" }}
                        type="text"
                        placeholder="0"
                        value={qty_4}
                        onChange={(event) => this.setState({ qty_4: event.target.value })}
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
