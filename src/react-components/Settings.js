import React from "react";
import {NumericInput, TextInput} from "./Inputs";
import {useLocalStorage} from "./hooks/useLocalStorage";
import {Defaults, Storage} from "../constants";
import {notify} from "../background";

export function Settings(props) {
    const [ backStake, setBackStake ] = useLocalStorage(Storage.BACK_STAKE, Defaults.STAKE)
    const [ commissionDiscount, setCommissionDiscount ] = useLocalStorage(Storage.COMMISSION_DISCOUNT, Defaults.COMMISSION_DISCOUNT)
    const [ retention, setRetention ] = useLocalStorage(Storage.RETENTION, Defaults.RETENTION)
    const [ webhookUrl, setWebhookUrl ] = useLocalStorage(Storage.WEBHOOK_URL)

    function sendTestHook() {
        const testGame = {
            league: "Test League",
            teamA: "Test team A",
            teamB: "Test team B",
            score: "2-1",
            urls: {
                betfair: "None! It's a fake game",
                bet365: "Still none, still fake"
            },
        }
        const testScore = {
            score: "2-1",
            back_odds: 12,
            lay_odds: 13,
            bore_draw_odds: 5.4,
            outcomes: {
                backWins: { total: 1.39 },
                boreDraw: { total: 1.46 },
                other: { total: 1.46 }
            }
        }
        notify(testGame, testScore, 50, 46.37, 7.8)
        alert("Test hook sent")
    }

    return (
        <div id='settings'>
            <NumericInput id="stake" label="Back Stake" value={backStake} onChange={setBackStake} />
            <NumericInput id="commission-discount" label="Commission Discount" value={commissionDiscount} onChange={setCommissionDiscount} />
            <NumericInput id="retention" label="Retention" value={retention} onChange={setRetention} />
            <TextInput id="webhook" label="Webhook" value={webhookUrl} onChange={setWebhookUrl} />
            <button onClick={sendTestHook}>Test hook</button>
        </div>
    )
}