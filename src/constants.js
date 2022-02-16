export const Action = {
    NOTIFY: 'notify',
    REMOVE_TAB: 'removeTab',
    SCRAPE_GAME: 'scrapeGame',
    SCRAPED_GAME: 'scrapedGame',
    SCRAPE_STATE_UPDATED: 'scrapeStateUpdated',
    SEND_UNMATCHED_DATA: 'sendUnmatchedData'
}

export const Alarm = {
    CHECK_REFRESH: 'checkRefresh',
    FLUSH_NOTIFY_CACHE: 'flushNotifyCache',
    PURGE_OLD_GAMES: 'purgeOldGames'
}

export const Bookie = {
    BET365: 'bet365',
    BETFAIR: 'betfair'
}

export const Bet365 = {
    HOST: 'https://www.bet365.com.au/',

    // URL of the bet365 soccer home page
    SOCCER_HOMEPAGE: 'https://www.bet365.com.au/#/AS/B1/',

    // URL prefix that identifies a soccer league page
    LEAGUE_URL_PREFIX: 'https://www.bet365.com.au/#/AC/B1/C1/',

    // URL prefix that identifies a soccer game page
    GAME_URL_PREFIX: 'https://www.bet365.com.au/#/AC/B1/C1/D8/',

    // There are a few groups of links on the soccer homepage. This is the title of the one
    // we care about selecting league links from
    LEAGUE_GROUP_TITLE: 'Competitions'
}

export const Betfair = {
    // URL of the betfair homepage
    SOCCER_HOMEPAGE: 'https://www.betfair.com.au/exchange/plus/football',

    // URL prefix of soccer game pages
    SOCCER_GAME_PAGE: 'https://www.betfair.com.au/exchange/plus/football/market/',

    COMMISSION: 0.05
}

export const Defaults = {
    STAKE: 50,
    COMMISSION_DISCOUNT: 0,
    RETENTION: 80
}

export const State = {
    IN_PROGRESS: 'inProgress',
    INACTIVE: 'inactive',
}

export const Storage = {
    BACK_STAKE: 'backStake',
    COMMISSION_DISCOUNT: 'commissionDiscount',
    LAST_PROCESSED: 'lastProcessed',
    NOTIFY_CACHE: 'notifyCache',
    RETENTION: 'retention',
    WEBHOOK_URL: 'webhookUrl'
}

export const Time = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
}

/**
 * Shortcut function to return to storage key used for storing game data
 *
 * @param {string} bookie
 * @returns {string}
 */
export function dataKey(bookie) {
    return bookie + 'Data';
}