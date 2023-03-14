import React, { Component, useEffect } from 'react';
import './App.css';
import Web3 from 'web3'
import { keccak512 } from 'js-sha3'
import { base58_to_binary, binary_to_base58 } from "base58-js";

import Inheritance_abi from "./Inheritance_abi.json";
import WeaveHash_abi from "./WeaveHash_abi.json";

import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import {coinbaseWallet} from "./Writer";
const Buffer = require("buffer").Buffer

const useSolana = true;

const solanaWeb3 = useSolana ? require("@solana/web3.js") : null;


const gasPrice = 1000; //saving tokens. It seems any gas price will work (for now) as the netowrk is not used

const CHAIN_ID = "0x14A33"; //base testnet
const CONTRACT_ADDRESS = useSolana ? "G9nmhaToGZr2ih7X24Zo72w6fYLAEYU9EMjSo5M5D3vf" : "0xc2CA9937fCbd04e214965fFfD3526045aba337CC";
const CONTRACT_STORAGE_ADDRESS = useSolana ? "J12GJcqn3WneSUS1FMqHNAoeRMWExuRpKLNXHrgSnfMk" : null;

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

const ethereum = useSolana ? null : coinbaseWallet.makeWeb3Provider(CHAIN_URL, CHAIN_ID);
window.ethereum = ethereum;


class Oracle extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentWallet: null,
            signed: 0,
            oraclesCount: 0,
            unlocked: false,
        };

    }

    componentDidMount() {
        if (!useSolana) {
            this.loadWeb3().then(async () => {
                this.status();
            });
        } else {
            this.status();
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

    async status() {
        if (useSolana) {
            let connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("testnet"), "confirmed");

            const programAccount = new solanaWeb3.PublicKey(CONTRACT_STORAGE_ADDRESS);
            const accountInfo = await connection.getAccountInfo(programAccount, "confirmed");
            const data = accountInfo.data;
            //console.log(data)

            const oracles = [];
            const votes = [];

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

                //console.log(odata)
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

                    //console.log(wdata)
                    //console.log(sigdata)
                    votes.push({
                        source: wdata.toString('utf8'),
                        signature: sigdata.toString('utf8')
                    });
                }
            }

            const res = {
                is_unlocked,
                oracles,
                votes
            };
            console.log(res);

            var unique = new Set();
            for (let i in votes) {
                unique.add(votes[i].source);
                //TODO: check signature. also in the contract
            }

            this.setState({
                oraclesCount: res.oracles ? res.oracles.length : 0,
                signed: unique.size,
                unlocked: is_unlocked
            })
        } else {
            const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);
            const oracles = await contract.methods.OraclesCount().call({chainId: CHAIN_ID});
            let signed = 0;
            for (let i = 0; i < oracles; i++) {
                const o = await contract.methods.Oracles(i).call({chainId: CHAIN_ID});
                if (o.signature.length > 0) {
                    signed++;
                }
            }

            const unlocked = await contract.methods.Unlocked().call({chainId: CHAIN_ID});
            this.setState({
                oraclesCount: oracles,
                signed: signed,
                unlocked: unlocked > 0
            })
        }
    }

    async connect() {
        this.setState({ currentWallet: await this.getCurrentWallet() });

        if (useSolana) {

        } else {
            const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);
            console.log(await contract.methods.Oracles(0).call())
            console.log(await contract.methods.Oracles(1).call())
            console.log(await contract.methods.Oracles(2).call())
        }
    }

    async vote() {
        if (useSolana) {
            const account = this.state.currentWallet;
            let msg = "I confirm that it's time" +
                "\n\nWallet: " + account;

            const sig = binary_to_base58((await window.solana.signMessage(new TextEncoder().encode(msg), 'utf8')).signature);

            const accbytes = new TextEncoder().encode(account);
            const sigbytes = new TextEncoder().encode(sig);
            function le(val) {
                const res = new Uint8Array(4);
                res[0] =  val & 0xFF;
                res[1] = (val >> 8) & 0xFF;
                res[2] = (val >> 16) & 0xFF;
                res[3] = (val >> 24) & 0xFF;
                return res;
            }
            var tdata = new Uint8Array(1 + 4 + accbytes.length + 4 + sigbytes.length);
            tdata[0] = 1; //vote
            tdata.set(le(accbytes.length), 1);
            tdata.set(accbytes, 1 + 4);
            tdata.set(le(sigbytes.length), 1 + 4 + accbytes.length);
            tdata.set(sigbytes, 1 + 4 + accbytes.length + 4);

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
                        { pubkey: accountKey, isSigner: false, isWritable: false }
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

            setTimeout(() => this.status(), 3000);
        } else {
            const contract = await new window.web3.eth.Contract(Inheritance_abi, CONTRACT_ADDRESS);

            const account = this.state.currentWallet;
            let msg = "I confirm that it's time" +
                "\n\nWallet: " + account;

            const signature = useSolana ? binary_to_base58((await window.solana.signMessage(new TextEncoder().encode(msg), 'utf8')).signature)
                : await ethereum.request({
                    method: 'personal_sign',
                    params: [msg, account]
                });

            const vote = await contract.methods.vote(signature).send({
                chainId: CHAIN_ID,
                from: account,
                gasPrice: gasPrice
            });
            console.log(vote)
        }

        this.status();
    }

    render() {
        return <section className="text-gray-300 bg-black min-h-screen pb-32 font-inter">
            <header className="items-center justify-between pt-12">
                <h1 className="mx-auto text-center pb-2 text-5xl font-extrabold text-gray-300">
                    Oracle View
                </h1>
            </header>

            <div class="text-sm items-center text-center mt-6">
                <div class="max-w-2xl p-6 mx-auto text-center backdrop-sepia-0 backdrop-blur-sm border shadow-xl border-black">

                    <div className="flex justify-between">
                        <p className="text-zinc-500 font-bold text-left">Connected Address: </p>
                        <span className="text-zinc-300">{this.state.currentWallet}</span>
                    </div>

                    <div class="transition border border-white p-6 my-6 ">
                        <label className="mx-auto text-center pb-2 text-xl font-bold text-zinc-500 ">Witnesses Signed:</label> <span className="mx-auto text-center pb-2 text-xl font-bold text-white"> {this.state.signed} of {this.state.oraclesCount} required</span>
                        <br />
                        <br />
                        <br />
                        <label className="mx-auto text-center pb-2 text-xl font-bold text-zinc-500">Will Unlocked:</label> <span className="mx-auto text-center pb-2 text-xl font-bold text-white">{this.state.unlocked ? "Yes" : "No"}</span>
                        <br />
                        <br />
                        <br />
                        <button className="px-5 py-2.5 mt-2 text-lg font-semibold text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow mx-2" type="submit" onClick={() => this.connect()}>Connect Wallet</button>
                        &nbsp;
                        <button className="px-5 py-2.5 mt-2 text-lg font-semibold text-slate-900 bg-white hover:bg-zinc-200 rounded-md shadow mx-2" type="submit" onClick={() => this.vote()}>Bear witness to death</button>
                    </div>
                </div>
            </div>


        </section>
    }
}

export default Oracle;
