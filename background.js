const BET365_HOST = 'https://www.bet365.com.au';
const BETFAIR_HOST = 'https://www.betfair.com.au/exchange/plus/football'
chrome.tabs.onUpdated.addListener((id, info, tab)  => {
    if (info.status === 'complete') {
        if (tab.url.startsWith(BET365_HOST)) {
            chrome.tabs.executeScript(id, { file: "./bet365Scraper.js" } )
        } else if (tab.url.startsWith(BETFAIR_HOST)) {
            chrome.tabs.executeScript(id, { file: "./betfairScraper.js" })
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'processBetfairGame') {

        chrome.storage.get('betfairGameLinks', storage => {
            processBetfairGame(sender.tab.id, storage.betfairGameLinks[message.index])
        })
    }
})

function processBetfairGame(tabId, gameUrl)
{
    chrome.tabs.update(tabId, { url: gameUrl })
}