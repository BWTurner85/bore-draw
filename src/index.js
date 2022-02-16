import './css/index.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import {BookieState} from "./react-components/BookieState";
import {Bookie} from "./constants";
import React from "react";
import ReactDOM from 'react-dom'
import {CombinedData} from "./react-components/CombinedData";
import {Settings} from "./react-components/Settings";

function App(props) {
    return (
        <div id="wrapper">
            <Settings />
            <BookieState name={Bookie.BET365} />
            <BookieState name={Bookie.BETFAIR} />
            <CombinedData />
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));