import './css/index.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import {BookieState} from "./react-components/BookieState";
import {Bookie, Storage} from "./constants";
import React from "react";
import ReactDOM from 'react-dom'
import {CombinedData} from "./react-components/CombinedData";
import {useLocalStorage} from "./react-components/hooks/useLocalStorage";

function NumericInput(props) {
    return (<span className='input numericInput'>
        <label>{props.label}:</label>
        <input
            type='number'
            value={props.value}
            onChange={e => props.onChange(e.target.value)}
        />
    </span>)
}

function TextInput(props) {
    return (<span className='input textInput'>
        <label>{props.label}:</label>
        <input type='text' value={props.value} onChange={e => props.onChange(e.target.value)} />
    </span>)
}

function Settings(props) {
    const [ backStake, setBackStake ] = useLocalStorage(Storage.BACK_STAKE, 50)
    const [ commissionDiscount, setCommissionDiscount ] = useLocalStorage(Storage.COMMISSION_DISCOUNT, 0)
    const [ retention, setRetention ] = useLocalStorage(Storage.RETENTION, 80)
    const [ webhookUrl, setWebhookUrl ] = useLocalStorage(Storage.WEBHOOK_URL)


    return (
        <div id='settings'>
            <NumericInput label="Back Stake" value={backStake} onChange={setBackStake} />
            <NumericInput label="Commission Discount" value={commissionDiscount} onChange={setCommissionDiscount} />
            <TextInput label="Retention" value={retention} onChange={setRetention} />
            <TextInput label="Webhook" value={webhookUrl} onChange={setWebhookUrl} />
        </div>
    )
}

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