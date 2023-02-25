import React, { Component, useEffect } from 'react';
import Writer from './Writer';
import Reader from './Reader';
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
            screen: (this.state.screen + 1) % 2
        });
    }

    render() {
        return <div>
            <div >
                <img src={logo} className="logo m-4" alt="logo" />

                <button type="submit" onClick={() => this.switch()}>
                    Switch View
                </button>
            </div>
            {this.state.screen == 0
                ? <Writer />
                : <Reader />
            }
        </div>;
    }
}

export default App;
