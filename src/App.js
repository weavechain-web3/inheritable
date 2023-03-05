import React, { Component, useEffect } from 'react';
import Writer from './Writer';
import Reader from './Reader';
import Oracle from './Oracle';
import logo from './logo.svg';
import inherilogo from './resources/inheri-logo.svg';
import verifySvg from "./resources/verify.svg";
import signSvg from "./resources/ri_quill-pen-fill.svg";
import witnessSvg from "./resources/witness.svg";



import './App.css';


class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            screen: 0
        };
    }

    switch() {
        this.setState({
            screen: (this.state.screen + 1) % 3
        });
    }

    switchWriter() {
        this.setState({
            screen: 0
        });
    }

    render() {
        return <div className="font-serif bg-zinc-900 ">
            <div className="fixed w-1/4 h-full">
                <div className='flex justify-center '>
                    <img src={inherilogo} className="logo m-4 w-2/3 ml-2" alt="logo" />
                </div>
                <div className='text-zinc-500 h-2/5 mt-10 text-md pl-8 flex flex-col justify-around'>
                    <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 0 })}>
                        <img src={signSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <a className='text-center ' > Enscribe and sign will </a>
                    </div>

                    <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 1 })}>
                        <img src={witnessSvg} className="w-5 h-5 mr-2" alt="logo" />
                        <p className='text-center'> Bear witness to passing </p>
                    </div>

                    <div className='flex items-center justify-left hover:underline hover:text-white hover:cursor-pointer' onClick={() => this.setState({ screen: 2 })}>
                        <img src={verifySvg} className="w-5 h-5 mr-2" alt="logo" />
                        <p className='text-center'> Verify and release will </p>
                    </div>
                </div>
                <div className='h-1/3 flex flex-col justify-end items-end'>
                    <div className='flex flex-nowrap items-center'>
                        <span className='text-white font-light text-m'>Powered by    </span>
                        <img src={logo} className="h-12 w-12 mr-12 ml-4" alt="logo" />
                    </div>
                </div>
            </div>
            <div className=" flex ">
                <div className='w-1/4 bg-zinc-900 flex flex-col'>
                </div>
                <div className='w-3/4 bg-black'>
                    {this.state.screen == 0 ? <Writer />
                        : this.state.screen == 1 ? <Oracle />
                            : <Reader />
                    }
                </div>
            </div>

        </div >;
    }
}

export default App;
