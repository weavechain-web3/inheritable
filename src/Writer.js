import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import WeaveHelper from "./weaveapi/helper";

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
        
    }

    render() {
        const {
            rootHash,
            claim_1, qty_1,
            claim_2, qty_2,
            claim_3, qty_3,
            claim_4, qty_4
        } = this.state;

        return <div>
            <header>
                <h1>
                    Writing a Will
                </h1>
                <h1>
                    Writer View
                </h1>
            </header>

            <div>
                <div>
                    <span>Connected MetaMask address: </span> <span> {this.state.currentMetamaskAccount}</span>
                    <br />
                    <br />
                    <span>Weavechain public key: </span> <span>{this.state.publicKey}</span>
                    <br />
                    <br />
                    <span>___</span>
                    <br />
                    <br />
                    <div>Please introduce the will items</div>
                    <br />

                    
                    <br />
                    <br />
                    <button type="submit" onClick={() => this.connect()}>Connect Wallet</button>
                    &nbsp;
                    <button type="submit" onClick={() => this.write()}>Write</button>
                </div>
            </div>
            <br />
        </div>;
    }
}

export default Writer;
