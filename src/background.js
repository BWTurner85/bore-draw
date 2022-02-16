import {Action, Alarm, Bet365, Betfair, Bookie, dataKey, State, Storage, Time} from "./constants";
import {debug} from "./logger";
import {upsertToLocalStorageObject} from "./util";
import {processSingleGame, processData} from "./dataProcessor";

/**
 * Listen for tab load events.
 *
 * Bet365 clicks reload the page so we need to re-inject the script each time the scraping tab loads
 */
chrome.tabs.onUpdated.addListener((id, info, tab)  => {
    if (info.status === 'complete') {
        if (tab.url.startsWith(Bet365.HOST)) {
            const storageKey = stateKey(Bookie.BET365)
            chrome.storage.local.get(storageKey, storage => {
                if (tab.id === storage[storageKey]?.tabId) {
                    chrome.tabs.executeScript(tab.id, { file: "./src/bet365Scraper.js" } )
                }
            })
        }
    }
});

/**
 * Configure toolbar button to open the options page as a full tab instead of a small popup
 */
chrome.browserAction.onClicked.addListener(function (activeTab) {
    chrome.runtime.openOptionsPage()
});


/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    switch (message.action) {
        /** Trigger webhook **/
        case Action.NOTIFY:
            notify(message.game, message.score, message.backStake, message.layStake, message.boreDrawLayStake)
            break

        /** Close a tab **/
        case Action.REMOVE_TAB:
            chrome.tabs.remove(message.tabId || sender.tab.id)
            break

        /** Trigger scraping a specific game **/
        case Action.SCRAPE_GAME:
            scrapeSingleGame(message.bookie, message.url)
            break

        /** Game got scraped **/
        case Action.SCRAPED_GAME:
            processSingleGame(message.game)
            break;
    }
})

/**
 * Send a message about an action having occurred for a specific bookie
 *
 * @param {string} action
 * @param {string} bookie
 */
function sendAction(action, bookie)
{
    chrome.runtime.sendMessage({ action, bookie })
}

function scrapeSingleGame(bookie, url) {
    chrome.tabs.create(
        { url, active: false, index: 0, pinned: true },
        tab => {
            const script = './src/' + bookie + 'Scraper.js'
            chrome.tabs.executeScript(tab.id, { file: script } )
        }
    )
}
/**
 * Kick off scraping of the specified bookie
 *
 * @param bookie
 */
function resumeScrape(bookie) {
    const storageKey = 'scrapeState' + bookie
    const script = './src/' + bookie + 'Scraper.js'
    const url = bookie === Bookie.BETFAIR ? Betfair.SOCCER_HOMEPAGE : Bet365.SOCCER_HOMEPAGE

    chrome.tabs.create(
        { url: url, active: false, index: 0, pinned: true },
        tab => {
            upsertToLocalStorageObject(
                storageKey,
                {
                    state: State.IN_PROGRESS,
                    started: Date.now(),
                    tabId: tab.id
                },
                () => {
                    // Bet365 script injection is handled via a tab update event so only inject betfair
                    if (bookie === Bookie.BETFAIR) {
                        chrome.tabs.executeScript(tab.id, { file: script } )
                    }
                    sendAction(Action.SCRAPE_STATE_UPDATED, bookie)
                }
            )
        }
    )
}

/**
 * Shortcut function to return the storage key used for scraping state
 *
 * @param {string} bookie
 * @return {string}
 */
function stateKey(bookie) {
    return 'scrapeState' + bookie;
}

/** Configure alarms for periodic events **/
chrome.alarms.create(Alarm.CHECK_REFRESH, { delayInMinutes: 1, periodInMinutes: 1 })
chrome.alarms.create(Alarm.FLUSH_NOTIFY_CACHE, { delayInMinutes: 30, periodInMinutes: 60 })
chrome.alarms.create(Alarm.PURGE_OLD_GAMES, { delayInMinutes: 60, periodInMinutes: 60 })

/** Listen for alarm events **/
chrome.alarms.onAlarm.addListener(alarm => {
    switch (alarm.name) {
        case Alarm.CHECK_REFRESH:
            triggerPeriodicRefresh(Bookie.BET365)
            triggerPeriodicRefresh(Bookie.BETFAIR)
            break;

        case Alarm.FLUSH_NOTIFY_CACHE:
            flushNotifyCache()
            break;

        case Alarm.PURGE_OLD_GAMES:
            purgeOldGames(Bookie.BET365)
            purgeOldGames(Bookie.BETFAIR)
            break;
    }
})

/** Flush old items from the notification cache */
function flushNotifyCache() {
    let cache = JSON.parse(localStorage.getItem(Storage.NOTIFY_CACHE)) || []
    const currentCacheSize = cache.length;

    cache = cache.filter(item => item.time > (Date.now() - 60 * Time.MINUTE))

    debug("Flushed old items from notify cache. Removed " + (currentCacheSize - cache.length) + " entries");
    localStorage.setItem(Storage.NOTIFY_CACHE, JSON.stringify(cache))
}

/** Purge data for games that have already happened **/
function purgeOldGames(bookie) {
    chrome.storage.local.get(dataKey(bookie), storage => {
        const data = storage[dataKey(bookie)]

        for (let league in data) {
            data[league] = data[league].filter(game => game.matchTime > Date.now())

            if (data[league].length === 0) {
                delete(data[league])
            }
        }

        debug("Purging old games for ", bookie, ". AFTER: ", data)

        chrome.storage.local.set({ [dataKey(bookie)]: data })
    })
}

/**
 * This function is triggered by an alarm every minute and takes care of managing
 * periodic partial refreshes for the selected bookie
 *
 * @param bookie
 */
function triggerPeriodicRefresh(bookie) {
    chrome.storage.local.get([ stateKey(bookie) ], storage => {
        const state = storage[stateKey(bookie)] || {}
        debug(`[${bookie}] Checking periodic scrape. Current state: `, state)

        if (!state.state || state.state === State.INACTIVE) {
            if (!state.stopped || (Date.now() - state.stopped) > (30 * Time.SECOND)) {
                debug(`[${bookie}] Resuming scrape`)
                resumeScrape(bookie)
            } else {
                debug(`[${bookie}] Previously finished too recently. Waiting`)
            }
        } else {
            chrome.tabs.get(state.tabId, tab => {
                if (!tab) {
                    const suppressError = chrome.runtime.lastError;
                    debug(`[${bookie}] In progress tab was closed unexpectedly. Resuming`);
                    resumeScrape(bookie)
                } else if (Date.now() - state.started > 5 * Time.MINUTE) {
                    debug(`[${bookie}] Current tab has been processing for 5+ minutes. Recreating`)
                    chrome.tabs.remove(
                        state.tabId,
                        () => resumeScrape(bookie)
                    );
                } else {
                    debug(`[${bookie}] Fresh scrape in progress`)
                }
            })
        }
    })
}

/**
 * Send webhook notification about an arb event
 *
 * @param game
 * @param score
 * @param backStake
 * @param layStake
 * @param boreDrawLayStake
 */
export function notify(game, score, backStake, layStake, boreDrawLayStake)
{
    const webhook = JSON.parse(localStorage.getItem(Storage.WEBHOOK_URL));
    const notifyCache = JSON.parse(localStorage.getItem(Storage.NOTIFY_CACHE))
    if (!webhook) {
        return;
    }

    const message = {
        league: game.league,
        teamA: game.teamA,
        teamB: game.teamB,
        score: score.score,
        urls: game.urls,
        backStake,
        layStake,
        boreDrawLayStake,
        profit: Math.min(score.outcomes?.backWins?.total, score.outcomes?.boreDraw?.total, score.outcomes?.other?.total)
    }

    debug("Sending webhook: ", message);

    const hash = game.league + game.teamA + game.teamB + score.score;
    if (notifyCache.find(item => item.hash === hash)) {
        debug("Notification for ", message, "previously sent")
        //return;
    } else if (game.league !== "Test League") {
        debug("Sending webhook to ", webhook, ": ", message)
        notifyCache.push({ time: Date.now(), hash })
    }

    fetch(webhook, {
        body: JSON.stringify(message),
        method: "POST"
    });
    localStorage.setItem(Storage.NOTIFY_CACHE, JSON.stringify(notifyCache))
}