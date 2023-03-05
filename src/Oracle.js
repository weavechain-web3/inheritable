import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import { keccak512 } from 'js-sha3'

import Inheritance_abi from "./Inheritance_abi.json";
import WeaveHash_abi from "./WeaveHash_abi.json";

import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import {coinbaseWallet} from "./Writer";
const Buffer = require("buffer").Buffer

const gasPrice = 1000; //saving tokens. It seems any gas price will work (for now) as the netowrk is not used

const CHAIN_ID = "0x14A33"; //base testnet
const CONTRACT_ADDRESS = "0xc2CA9937fCbd04e214965fFfD3526045aba337CC";

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


class Oracle extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentMetamaskAccount: null,
            signed: 0,
            oraclesCount: 0,
            unlocked: false,
        };

    }

    componentDidMount() {
        this.loadWeb3().then(async () => {
            this.status();
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

    async status() {
        const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);
        const oracles = await contract.methods.OraclesCount().call({ chainId: CHAIN_ID });
        let signed = 0;
        for (let i = 0; i < oracles; i++) {
            const o = await contract.methods.Oracles(i).call({ chainId: CHAIN_ID });
            if (o.signature.length > 0) {
                signed++;
            }
        }

        const unlocked = await contract.methods.Unlocked().call({ chainId: CHAIN_ID });
        this.setState({
            oraclesCount: oracles,
            signed: signed,
            unlocked: unlocked > 0
        })
    }

    async connect() {
        this.setState({ currentMetamaskAccount: await this.getCurrentWallet() });

        const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);
        console.log(await contract.methods.Oracles(0).call())
        console.log(await contract.methods.Oracles(1).call())
        console.log(await contract.methods.Oracles(2).call())
    }

    async vote() {
        const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);

        const account = this.state.currentMetamaskAccount;
        let msg = "I confirm that it's time" +
            "\n\nWallet: " + account;

        const signature = await ethereum.request({
            method: 'personal_sign',
            params: [msg, account]
        });

        const vote = await contract.methods.vote(signature).send({ chainId: CHAIN_ID, from: account, gasPrice: gasPrice });
        console.log(vote)

        this.status();
    }


    render() {
        return <section className="text-gray-300 bg-black min-h-screen pb-32 font-serif">
            <header className="items-center justify-between pt-12">
                <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold text-gray-300">
                    Oracle View
                </h1>
            </header>

            <div class="text-sm items-center text-center mt-6">
                <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm border shadow-xl border-black">

                    <div className="flex justify-between">
                        <p className="text-white font-bold text-left">Connected MetaMask address: </p><span className="text-gray-300">{this.state.currentMetamaskAccount}</span>
                    </div>

                    <div class="transition border border-white p-6 my-6">
                        <label className="mx-auto text-center pb-2 text-2xl font-extrabold text-gray-300">Oracle Count:</label> <span className="mx-auto text-center pb-2 text-2xl font-extrabold text-yellow-600"> {this.state.signed}/{this.state.oraclesCount}</span>
                        <br />
                        <br />
                        <br />
                        <label className="mx-auto text-center pb-2 text-2xl font-extrabold text-gray-300">Will Unlocked:</label> <span className="mx-auto text-center pb-2 text-2xl font-extrabold text-yellow-600">{this.state.unlocked ? "Yes" : "No"}</span>
                        <br />
                        <br />
                        <br />
                        <button className="px-5 py-2.5 mt-2 text-lg font-semibold text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow mx-2" type="submit" onClick={() => this.connect()}>Connect Wallet</button>
                        &nbsp;
                        <button className="px-5 py-2.5 mt-2 text-lg font-semibold text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow mx-2" type="submit" onClick={() => this.vote()}>It's Time ...</button>
                    </div>
                </div>
            </div>


        </section>
    }
}

export default Oracle;
