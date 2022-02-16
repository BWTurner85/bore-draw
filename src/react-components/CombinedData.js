import React from "react";
import {Bookie} from "../constants";
import {processData} from "../dataProcessor";
import ReactJson from "react-json-view";
import {debug} from "../logger";

export function CombinedData(props) {
    const [ processedData, setProcessedData ] = React.useState({})
    const [ arbEvents, setArbEvents ] = React.useState({})

    React.useEffect(
        () => {
            chrome.storage.local.get(
                [ Bookie.BET365 + 'Data', Bookie.BETFAIR + 'Data' ],
                storage => {
                    const mergedData = processData(
                        storage[Bookie.BET365 + 'Data'] || {},
                        storage[Bookie.BETFAIR + 'Data'] || {},
                        false
                    )
                    setProcessedData(mergedData)
                }
            )
        }, []
    )

    React.useEffect(() => {
        let arbs = []
        for (let league in processedData) {
            processedData[league].forEach(game => {
                game.scores.forEach(score => {
                    if (score.arbable) {
                        arbs.push({
                            score: score,
                            game: game
                        })
                    }
                })
            })
        }

        debug(arbs);
        setArbEvents(arbs)

    }, [ processedData ])

    return (
        <div id="combinedData">
            <strong>Combined data - matching games</strong>
            <ReactJson src={processedData} collapsed={true} />

            <strong>Arbable events</strong>
            <ReactJson src={arbEvents} collapsed={1} />
        </div>
    )
}