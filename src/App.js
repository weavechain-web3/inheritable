import React, { Component, useEffect } from 'react';
import Writer from './Writer';
import Reader from './Reader';
import Oracle from './Oracle';
import logo from './logo.svg';
import logo2 from './logo2.svg';
import solana from './solana.svg'
import inherilogo from './resources/inheri-logo.svg';
import verifySvg from "./resources/verify.svg";
import signSvg from "./resources/ri_quill-pen-fill.svg";
import witnessSvg from "./resources/witness.svg";

import { NavBar } from './navBar';



import './App.css';





class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            screen: 0
        };
    }

    switchView() {
        this.setState({
            screen: (this.state.screen + 1) % 3
        });
    }

    SidebarWriter() {
        return (
            <div className='text-white h-2/5 mt-10 text-md pl-8 flex flex-col justify-around'>
                <div className='my-2'>
                    <div className='flex items-center justify-left'>
                        <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' >Enscribe Will Items</a>
                    </div>
                    <p className='font-light ml-7 text-zinc-500 text-xs'>Enter description, claim amount and beneficiary address</p>
                </div>

                <div className='my-2'>
                    <div className='flex items-center justify-left'>
                        <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' >Set Witnesses of Passing</a>
                    </div>
                    <p className='font-light ml-7 text-zinc-500 text-xs'>2 of 3 witnesses are required for proof of passing</p>
                </div>

                <div className='my-2'>
                    <div className='flex items-center justify-left'>
                        <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' >Sign Will</a>
                    </div>
                </div>


                {/* <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 1 })}>
                              <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Bear witness to passing </p>
                          </div>
      
                          <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 2 })}>
                              <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Verify and release will </p>
                          </div> */}
            </div>
        )
    }

    SidebarOracle() {
        return (
            <div className='text-white h-2/5 mt-10 text-md pl-8 flex flex-col justify-around'>
                <div className='my-2'>
                    <div className='flex items-center justify-left'>
                        <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' >Sign as Witness</a>
                    </div>
                    <p className='font-light ml-7 text-zinc-500 text-xs'>Bear witness for proof of passing</p>
                </div>

                {/* <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 1 })}>
                              <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Bear witness to passing </p>
                          </div>
      
                          <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 2 })}>
                              <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Verify and release will </p>
                          </div> */}
            </div>
        )
    }

    SidebarReader() {
        return (
            <div className='text-white h-2/5 mt-10 text-md pl-8 flex flex-col justify-around'>
                <div className='my-2'>
                    <div className='flex items-center justify-left '>
                        <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center '>View your Claim</a>
                    </div>
                    <p className='font-light ml-7 text-zinc-500 text-xs'>View will item of deceased addressed to you</p>
                </div>

                <div className='my-2'>
                    <div className='flex items-center justify-left'>
                        <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' >Verify Claim Integrity</a>
                    </div>
                    <p className='font-light ml-7 text-zinc-500 text-xs'>Verified that claim is untampered</p>
                </div>



                {/* <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 1 })}>
                              <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Bear witness to passing </p>
                          </div>
      
                          <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 2 })}>
                              <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                              <p className='text-center'> Verify and release will </p>
                          </div> */}
            </div>
        )
    }




    render() {
        return (
        <div className="font-serif bg-zinc-900 ">
         <NavBar />
            <div className="fixed w-1/4 h-full flex flex-col justify-between">
                <div className='max-h-2/5'>
                    <div className='flex justify-center '>
                        <img src={inherilogo} className="logo m-4 w-2/3 ml-2" alt="logo" />
                    </div>
                    {this.state.screen == 0 ? <this.SidebarWriter />
                        : this.state.screen == 1 ? <this.SidebarOracle />
                            : <this.SidebarReader />}
                </div>



                <div className='max-h-2/5 flex flex-col justify-end items-center'>

                    <div className='flex flex-col items-center text-zinc-300 border-2 rounded p-1 m-2'>
                    <div className='justify-center flex-nowrap flex items-center'>
                        <a className='font-sm pb-2 text-md'>Smart Contracts deployed on</a> <img src={solana} className="h-8 mb-2 w-12 ml-2" onClick={() => this.switchView()} alt="logo" />
                        </div>
                        <a target="_blank" href={"https://explorer.solana.com/address/3uCfjcPxnvWyNRSpBQKcDwpBmuAaXraPw8v7SzKicfmq?cluster=testnet"} className="text-xs font-light underline hover:text-indigo-300 hover:ease-in-out hover:transition hover:duration-700">Writing Hashes of the Will</a>
                        <a target="_blank" href={"https://explorer.solana.com/address/G9nmhaToGZr2ih7X24Zo72w6fYLAEYU9EMjSo5M5D3vf?cluster=testnet"} className="text-xs font-light underline hover:text-indigo-300 hover:ease-in-out hover:transition hover:duration-700">Oracle Signing</a>
                    </div>
                    <div className='flex flex-nowrap items-center m-1'>
                        <span className='text-white font-light text-m'>Anchored on</span>
                        <img src={solana} className="h-15 w-24 ml-2" onClick={() => this.switchView()} alt="logo" />
                    </div>

                    <div className='flex flex-nowrap items-center pb-6'>

                        <span className='text-white font-light text-m'>Powered by</span>
                        <img src={logo2} className="h-10 w-32 ml-2" onClick={() => this.switchView()} alt="logo" />
                    </div>

                </div>
            </div>



            <div className="font-inter flex ">
                <div className='w-1/4 bg-zinc-900 flex flex-col'>
                </div>
                <div className='w-3/4 bg-black'>
                    {this.state.screen == 0 ? <Writer />
                        : this.state.screen == 1 ? <Oracle />
                            : <Reader />
                    }
                </div>
            </div>

        </div>
        )
    }
}

export default App;
