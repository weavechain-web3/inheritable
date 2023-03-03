import React, { Component, useEffect } from 'react';
import Writer from './Writer';
import Reader from './Reader';
import Oracle from './Oracle';
import logo from './logo.svg';



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

    render() {
        return <div className="font-mono bg-zinc-800">
            <div className="font-mono flex items-center justify-between border border-black shadow-xl">
                <img src={logo} className="logo m-4" alt="logo" />

                <button className="px-5 py-2.5 m-4 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md shadow" type="submit" onClick={() => this.switch()}>
                    Switch View
                </button>
            </div>
            {this.state.screen == 0 ? <Writer />
                : this.state.screen == 1 ? <Oracle />
                : <Reader />
            }
        </div>;
    }
}

export default App;
