export const Action = {
    START_SCRAPE: 'startScrape',
    ABORT_SCRAPE: 'abortScrape',
    COMPLETED_SCRAPE: 'completedScrape',
    SCRAPE_STATE_UPDATED: 'scrapeStateUpdated'
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

export const State = {
    IN_PROGRESS: 'inProgress',
    ABORTED: 'aborted',
    COMPLETED: 'completed'
}

export const Storage = {
    BACK_STAKE: 'backStake',
    COMMISSION_DISCOUNT: 'commissionDiscount',
    RETENTION: 'retention',
    WEBHOOK_URL: 'webhookUrl'
}