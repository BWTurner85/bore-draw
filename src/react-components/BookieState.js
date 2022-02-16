import React from "react";
import {Action, State} from "../constants";
import {Accordion} from "react-bootstrap";
import ReactJson from "react-json-view";
import 'bootstrap/dist/css/bootstrap.min.css';
import {getUnmatchedGames} from "../dataProcessor";
import {debug} from "../logger";

export function BookieState({ name }) {
    const scrapeStateKey = 'scrapeState' + name
    const dataKey = name + 'Data'

    const [ rawData, setRawData ] = React.useState({})
    const [ rawState, setRawState ] = React.useState({})
    const [ unmatchedLeagues, setUnmatchedLeagues ] = React.useState([]);
    const [ unmatchedGames, setUnmatchedGames ] = React.useState({});
    /**
     * One off configuration when component is first loaded.
     *
     * Set the initial state string and configure message listener to listen for state updates
     */
    React.useEffect(() => {
        // Fetch unmatched games
        getUnmatchedGames(name)

        // Set raw data on load
        chrome.storage.local.get([ scrapeStateKey, dataKey ], storage => {
            setRawData(storage[dataKey] || {})
            setRawState(storage[scrapeStateKey] || {})
        })

        // Update scrape string when required
        chrome.runtime.onMessage.addListener(message => {
            debug("Message: ", message)
            if (message.bookie !== name) {
                return
            }

            if (message.action === Action.SCRAPE_STATE_UPDATED) {
                chrome.storage.local.get([ scrapeStateKey, dataKey] , storage => {
                    setRawState(storage[scrapeStateKey])
                    setRawData(storage[dataKey])
                })
            }

            if (message.action === Action.SEND_UNMATCHED_DATA) {
                setUnmatchedLeagues(message.leagues)
                setUnmatchedGames(message.games)
            }

        })
    }, [])

    /** Clear state data **/
    function clearState() {
        chrome.storage.local.set({ [scrapeStateKey]: { }})
        setRawState({})
    }

    /** Clear bookie data **/
    function clearData() {
        chrome.storage.local.set({ [dataKey]: { }})
        setRawData({})
    }

    /** State injection hackery */
    function setState() {
        const state = prompt("Enter state JSON", JSON.stringify(rawState))
        try {
            if (!state) {
                return
            }

            const parsedState = JSON.parse(state)
            if (parsedState) {
                chrome.storage.local.set({[scrapeStateKey]: parsedState});
                setRawState(parsedState)
            }
        } catch (e) {
            alert("Unable to set state. Invalid JSON: " + e)
        }
    }

    return (
        <div className='bookieState' id={name + "State"}>
            <strong>{name}</strong> <br />

            <button onClick={() => clearData()}>Clear data</button>
            <button onClick={() => clearState()}>Clear state</button>
            <button onClick={() => setState()}>Set state</button>

            <Accordion flush>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Raw scrape state</Accordion.Header>
                    <Accordion.Body>
                        <ReactJson src={rawState} collapsed={1}/>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                    <Accordion.Header>Raw data</Accordion.Header>
                    <Accordion.Body>
                        <ReactJson src={rawData} collapsed={1}/>
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                    <Accordion.Header>Unmatched data</Accordion.Header>
                    <Accordion.Body>
                        <strong>Leagues</strong>
                        <ReactJson src={unmatchedLeagues} collapsed={1} />

                        <strong>Games</strong>
                        <ReactJson src={unmatchedGames} collapsed={1} />
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </div>
    );
}