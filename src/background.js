import {Action, Bet365, Betfair, Bookie, State} from "./constants";
import {debug} from "./logger";
import {upsertToLocalStorageObject} from "./util";

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

        if (tab.url.startsWith(Betfair.SOCCER_GAME_PAGE)) {
            //chrome.tabs.executeScript(tab.id, { file: "./src/betfairScraper.js" } )
        }
    }
});

/**
 * Listen for tab close events.
 *
 * If the scraping tab is closed register that fact and abort the current scrape
 */
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    const bet365StateKey = stateKey(Bookie.BET365)
    const betfairStateKey = stateKey(Bookie.BETFAIR)

    chrome.storage.local.get([ bet365StateKey, betfairStateKey ], storage => {
        if (tabId === storage[bet365StateKey]?.tabId) {
            abortScrape(Bookie.BET365)
        } else if (tabId === storage[betfairStateKey]?.tabId) {
            abortScrape(Bookie.BETFAIR)
        }
    })
})

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
    debug("Message received: ", message);

    switch (message.action) {
        /** Kick off scraping for the specified bookie */
        case Action.START_SCRAPE:
            startScrape(message.bookie)
            break

        /** Scraping was aborted **/
        case Action.ABORT_SCRAPE:
            abortScrape(message.bookie);
            break;

        /** Notification the scraping has been completed for a bookie **/
        case Action.COMPLETED_SCRAPE:
            finaliseScrape(message.bookie);
            sendAction(Action.SCRAPE_STATE_UPDATED, message.bookie)
            break
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


/**
 * Kick off scraping of the specified bookie
 *
 * @param bookie
 */
function startScrape(bookie) {
    debug("Kicking off scraping for " + bookie)
    const storageKey = 'scrapeState' + bookie
    const script = './src/' + bookie + 'Scraper.js'
    const url = bookie === Bookie.BETFAIR ? Betfair.SOCCER_HOMEPAGE : Bet365.SOCCER_HOMEPAGE
    const bookieScrapeState = bookie === Bookie.BETFAIR
                            ? { regionIndex: 0, leagueIndex: 0, gameIndex: 0 }
                            : { lastLeague: -1 }
    chrome.tabs.create(
        { url: url, active: false, index: 0, pinned: true },
        tab => {
            upsertToLocalStorageObject(
                storageKey,
                {
                    state: State.IN_PROGRESS,
                    started: Date.now(),
                    tabId: tab.id,
                    ...bookieScrapeState
                },
                () => {
                    chrome.tabs.executeScript(tab.id, { file: script } )
                    sendAction(Action.SCRAPE_STATE_UPDATED, bookie)
                }
            )
        }
    )
}

/**
 * Mark the scrape process for a given bookie as having been aborted
 * @param bookie
 */
function abortScrape(bookie) {
    chrome.local.storage.get(stateKey(bookie), storage => {
        const tabId = storage[stateKey(bookie)]?.tabId
        if (tabId) {
            try {
                chrome.tabs.remove(tabId)
            } catch (e) { }
        }
    })

    upsertToLocalStorageObject(
        stateKey(bookie),
        { tabId: null, state: State.ABORTED },
        () => sendAction(Action.SCRAPE_STATE_UPDATED, bookie)
    )
}

/**
 * Finalise scraping for a given bookie when the injected script informs us it's done
 *
 * @param {string} bookie
 */
function finaliseScrape(bookie) {
    debug("Scrape completed for bookie: ", bookie)
    const scrapeStateKey = stateKey(bookie)

    chrome.storage.local.get(scrapeStateKey, storage => {
        const tabId = storage[scrapeStateKey].tabId;

        chrome.storage.local.set(
            { [scrapeStateKey]: {
                tabId: null,
                lastCompleted: Date.now(),
                state: State.COMPLETED
            } },
            () => {
                chrome.tabs.remove(tabId)
                sendAction(Action.SCRAPE_STATE_UPDATED, bookie)
            }
        )
    })
}

/**
 * Shortcut function to return the storage key used for scraping state
 *
 * @param {string} bookie
 */
function stateKey(bookie) {
    return 'scrapeState' + bookie;
}

chrome.contextMenus.create({
    title: "Scrape game page",
    "contexts": [ "browser_action" ],
    onclick: () => {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            tabs => {
                const tab = tabs[0]
                if (tab.url.startsWith(Bet365.HOST)) {
                    chrome.tabs.executeScript(tab.id, { file: "./src/bet365Scraper.js" } )
                } else if (tab.url.startsWith(Betfair.SOCCER_GAME_PAGE)) {
                    chrome.tabs.executeScript(tab.id, { file: "./src/betfairScraper.js" } )
                }
            }
        )
    }
})