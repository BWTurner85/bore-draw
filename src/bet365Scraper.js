import {Action, Bet365, Bookie} from "./constants";
import {debug} from "./logger";
import {awaitMultiElementLoad, awaitPageLoad, normaliseLeague} from "./util";

const scrapeStateKey = 'scrapeState' + Bookie.BET365;

(() => {
    if (location.href === Bet365.SOCCER_HOMEPAGE) {
        debug(`${location.href} identified as the soccer home page`)
        awaitPageLoad('.sm-SplashMarketGroup', scrapeNextLeague)
    } else if (location.href.startsWith(Bet365.GAME_URL_PREFIX)) {
        debug(`${location.href} identified as a soccer game page`)
        awaitPageLoad('.gl-MarketGrid', processGame, 5)
    } else if (location.href.startsWith(Bet365.LEAGUE_URL_PREFIX)) {
        debug(`${location.href} identified as a soccer league page`)
        awaitPageLoad('.rcl-ParticipantFixtureDetails_TeamNames', processLeague, 5);
    } else {
        debug("Loaded an unrecognised page - backtracking")
        window.history.back();
    }

    /**
     * Returns an array of league sections, excluding the 'popular' section since the leagues in there are duplicated
     *
     * @returns {*[]|*}
     */
    function getLeagueSections()
    {
        const marketGroups = document.querySelectorAll(".sm-SplashMarketGroup");
        if (!marketGroups) {
            return [];
        }

        let leagueGroup = Array.from(marketGroups).find(group => {
            return (group.querySelector('.sm-SplashMarketGroupButton_Text').innerText === Bet365.LEAGUE_GROUP_TITLE);
        })

        const leagueSections = leagueGroup.querySelectorAll('.sm-SplashMarket');
        return Array.from(leagueSections).filter(section => section.querySelector('.sm-SplashMarket_Title').innerText !== 'Popular')
    }

    /**
     * Scrape all soccer games
     */
    function scrapeNextLeague() {3
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey]
            debug("Scraping next league. Current state=", state)
            const sections = getLeagueSections()
            const sectionIndex = state.sectionIndex || 0;
            const section = sections[sectionIndex]

            if (!section) {
                debug("Section ", sectionIndex, "not found: Finalising scrape")
                chrome.storage.local.set(
                    { [scrapeStateKey]: { ...state, sectionIndex: 0 } },
                    () => chrome.runtime.sendMessage({ action: Action.COMPLETED_SCRAPE + 'x',  bookie: Bookie.BET365 })
                )

                return
            }

            if (!section.querySelector('.sm-SplashMarket_HeaderOpen')) {
                debug ("Section is closed. clicking to open")
                section.click()
                awaitMultiElementLoad(
                    () => Array.from(section.querySelectorAll('.sm-CouponLink_Title') || [] ),
                    () => processNextLeagueInSection(state, section),
                    500,
                    5
                )
            } else {
                debug("Section is open. Processing");
                processNextLeagueInSection(state, section)
            }
        })
    }

    /**
     *
     * @param {array} state Array of scrape state data
     * @param {Element} section
     */
    function processNextLeagueInSection(state, section) {
        const leagueIndex = state.leagueIndex || 0
        const league = section.querySelectorAll('.sm-CouponLink_Title').item(leagueIndex)
        const nextSection = (state.sectionIndex || 0) + 1
        if (!league) {
            debug("No more leagues in current section. Moving to next section. ", nextSection)
            chrome.storage.local.set(
                {
                    [scrapeStateKey]: {
                        ...state,
                        leagueIndex: 0,
                        sectionIndex: nextSection
                    }
                },
                () => scrapeNextLeague()
            )
        } else {
            debug("Clicking league ", league.innerText)
            chrome.storage.local.set(
                { [scrapeStateKey]: { ...state, leagueIndex: leagueIndex + 1 } },
                () => league.click()
            )
        }
    }

    /**
     *  Process a league page clicking through to each game to process
     */
    function processLeague() {
        debug("Processing soccer league page")
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey]
            const gameIndex = state.gameIndex || 0

            const games = document.querySelectorAll('div.rcl-ParticipantFixtureDetails:not(.rcl-ParticipantFixtureDetails_NoAdditionalMarkets)')
            if (games.item(gameIndex)) {
                chrome.storage.local.set(
                    { [scrapeStateKey]: { ...state, gameIndex: gameIndex + 1 } },
                    () => games.item(gameIndex).click()
                )
            } else {
                chrome.storage.local.set(
                    { [scrapeStateKey]: { ...state, tabId: null, gameIndex: 0 } },
                    () => chrome.runtime.sendMessage({ action: Action.REMOVE_TAB, tabId: state.tabId })
                )
            }
        })
    }

    /**
     * Process a game page - collecting all correct score odds
     */
    function processGame(attempt = 1) {
        debug("Processing game page")
        const btnAll = document.querySelectorAll('.gl-ButtonBar_Button').item(1)
        if (!btnAll) {

            if (attempt > 2) {
                debug("All scores button not found. Going back")
                window.history.back();
            } else {
                setTimeout(() => processGame(attempt + 1), 1000);
            }

            return;
        }

        btnAll.click()

        const league = normaliseLeague(document.querySelector('.sph-Breadcrumb').innerText.substring(9));
        const teams = document.querySelector('.sph-EventHeader_Label span').innerText.split(' v ');
        const matchTime = document.querySelector('.sph-ExtraData_TimeStamp')?.innerText || null;
        const oddsEls = btnAll.parentNode.parentNode.parentNode.parentNode.querySelectorAll('.gl-Market_General-cn1');

        chrome.storage.local.get([ 'bet365Data' ], storage => {
            let scoreData = []
            let seenScores = [];

            Array.from(oddsEls).forEach(oddsEl => {
                try {
                    let score = oddsEl.querySelector('.gl-ParticipantCentered_Name').innerText
                    if (seenScores.includes(score)) {
                        score = score.split("-").reverse().join("-")
                    }

                    seenScores.push(score);
                    scoreData.push({
                        score: score,
                        odds: parseFloat(oddsEl.querySelector('.gl-ParticipantCentered_Odds').innerText)
                    })
                } catch (err) {
                    // Scores are in 3 columns of variable length. This just means we're at an empty one
                }
            })

            let data = storage.bet365Data || {}
            data[league] = data[league] || []

            const game = {
                league: league,
                teamA: teams[0],
                teamB: teams[1],
                scores: scoreData,
                url: location.href,
                matchTime: matchTime ? Date.parse(matchTime) : null,
                scrapeTime: Date.now()
            }
            const existingIndex = data[league].findIndex(item => item.url === game.url);
            if (existingIndex >= 0) {
                debug("Replacing existing game at ", existingIndex, ": ", game);
                data[league][existingIndex] = game;
            } else {
                debug("Adding as new game: ", game);
                data[league].push(game)
            }

            chrome.runtime.sendMessage({ bookie: 'bet365', game })

            // TODO: Could reduce page loads by clicking through to the next game directly from here
            chrome.storage.local.set({ bet365Data: data }, () => window.history.back())
        })
    }
})()