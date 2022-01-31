import React from "react";
import {Action, State} from "../constants";
import {Accordion} from "react-bootstrap";
import ReactJson from "react-json-view";
import 'bootstrap/dist/css/bootstrap.min.css';

export function BookieState(props) {
    const scrapeStateKey = 'scrapeState' + props.name
    const dataKey = props.name + 'Data'

    const [ stateString, setStateString ] = React.useState("")
    const [ rawData, setRawData ] = React.useState({});

    /**
     * One off configuration when component is first loaded.
     *
     * Set the initial state string and configure message listener to listen for state updates
     */
    React.useEffect(() => {
        // Set state string immediately upon load
        setStateStringFromState()

        // Set raw data on load
        chrome.storage.local.get(dataKey, storage => {
            setRawData(storage[dataKey] || {})
        })

        // Update scrape string when required
        chrome.runtime.onMessage.addListener(message => {
            if (message.bookie === props.name && message.action === Action.SCRAPE_STATE_UPDATED) {
                setStateStringFromState()
            }
        })
    }, [])

    /** Check the stored scrape state and update the state string accordingly*/
    function setStateStringFromState() {
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey] ?? {}
            let label

            switch (state.state) {
                case State.COMPLETED:
                    label = "Last full scrape: " + (new Date(state.lastCompleted)).toLocaleString()
                    break
                case State.IN_PROGRESS:
                    label = "Full scrape in progress. Started " + (new Date(state.started)).toLocaleString()
                    break
                case State.ABORTED:
                    if (state.lastCompleted) {
                        label = "Latest scrape aborted. Last successful scrape completed: " + (new Date(state.lastCompleted)).toLocaleString()
                    } else {
                        label = "Latest scrape aborted. No full scrape completed"
                    }
                    break
                default:
                    label = "Full scrape not yet started"
            }

            setStateString(label)
        })
    }

    /** Fire off a message to start scraping */
    function startScrape() {
        chrome.runtime.sendMessage({action: Action.START_SCRAPE, bookie: props.name})
    }

    /** Clear bookie data **/
    function clearData() {
        chrome.storage.local.set({ [dataKey]: { }})
        setStateString("Data cleared: " + new Date().toLocaleString())
        setRawData({})
        chrome.runtime.sendMessage({ action: Action.ABORT_SCRAPE, bookie: props.name })
    }

    return (
        <div className='bookieState' id={props.name + "State"}>
            <strong>{props.name}</strong> <br />
            <span className='status'>{stateString}</span> <br />
            <button className='startScrape' onClick={() => startScrape()}>
                Start Scrape
            </button>

            <button onClick={() => clearData()}>Clear data</button>

            <Accordion flush>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Raw data</Accordion.Header>
                    <Accordion.Body>
                        <ReactJson src={rawData} collapsed={1}/>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </div>
    );
}