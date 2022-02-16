import {Action, Bet365, Bookie, State} from "./constants";
import {debug} from "./logger";
import {awaitMultiElementLoad, awaitPageLoad, normaliseLeague} from "./util";

const scrapeStateKey = 'scrapeState' + Bookie.BET365;

(() => {
    if (location.href === Bet365.SOCCER_HOMEPAGE) {
        awaitPageLoad('.sm-SplashMarketGroup', scrapeNextLeague)
    } else if (location.href.startsWith(Bet365.GAME_URL_PREFIX)) {
        awaitPageLoad('.gl-MarketGrid', processGame, 5)
    } else if (location.href.startsWith(Bet365.LEAGUE_URL_PREFIX)) {
        awaitPageLoad('.rcl-ParticipantFixtureDetails_TeamNames', processLeague, 5);
    } else {
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey]
            chrome.storage.local.set(
                { [scrapeStateKey]: { ...state, gameIndex: state.gameIndex + 1 } },
                () => {
                    window.history.back()
                    chrome.runtime.sendMessage({action: Action.SCRAPE_STATE_UPDATED, bookie: Bookie.BET365})
                }
            )
        })
    }

    /**
     * Kick off scraping the next league
     */
    function scrapeNextLeague() {
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey]
            debug("Scraping next league. Current state=", state)
            const sections = getLeagueSections()
            const sectionIndex = state.sectionIndex || 0;
            const section = sections[sectionIndex]

            // If the section doesn't exist return to the start and retry
            if (!section) {
                debug("Section ", sectionIndex, "not found. Returning to start")
                chrome.storage.local.set(
                    { [scrapeStateKey]: {
                        ...state,
                        sectionIndex: 0,
                        leagueIndex: 0,
                        gameIndex: 0,
                        state: state.INACTIVE,
                        started: null,
                        ended: Date.now()
                    } },
                    () => {
                        chrome.runtime.sendMessage({ action: Action.REMOVE_TAB })
                        chrome.runtime.sendMessage({action: Action.SCRAPE_STATE_UPDATED, bookie: Bookie.BET365})
                    }
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
     *
     * @param {array} state Array of scrape state data
     * @param {Element} section
     */
    function processNextLeagueInSection(state, section) {
        const leagueIndex = state.leagueIndex || 0
        const league = section.querySelectorAll('.sm-CouponLink_Title').item(leagueIndex)
        debug("Processing league index: ", leagueIndex, " in section: ", section)
        if (league) {
            debug("Clicking league ", league.innerText)
            league.click();
        } else {
            const nextSection = (state.sectionIndex || 0) + 1
            debug("No more leagues in current section. Moving to next section. ", nextSection)
            chrome.storage.local.set(
                {
                    [scrapeStateKey]: {
                        ...state,
                        sectionIndex: nextSection,
                        leagueIndex: 0,
                        gameIndex: 0,
                        state: State.INACTIVE,
                        started: null,
                        ended: Date.now()
                    }
                },
                () => {
                    chrome.runtime.sendMessage({ action: Action.REMOVE_TAB, tabId: state.tabId })
                    chrome.runtime.sendMessage({action: Action.SCRAPE_STATE_UPDATED, bookie: Bookie.BET365})
                }
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
                // Process the game
                games.item(gameIndex).click();
            } else {
                // Final game in the league. Finish up until next time
                debug("No more games in current league. Closing off");
                chrome.storage.local.set(
                    { [scrapeStateKey]: {
                        ...state,
                        state: State.INACTIVE,
                        stopped: Date.now(),
                        tabId: null,
                        leagueIndex: (state.leagueIndex || 0) + 1,
                        gameIndex: 0
                    } },
                    () => {
                        chrome.runtime.sendMessage({ action: Action.REMOVE_TAB, tabId: state.tabId })
                        chrome.runtime.sendMessage({action: Action.SCRAPE_STATE_UPDATED, bookie: Bookie.BET365})
                    }
                )
            }
        })
    }

    /**
     * Process a game page - collecting all correct score odds
     */
    function processGame(standalone = false, attempt = 1) {
        debug("Processing game page")
        const btnAll = document.querySelectorAll('.gl-ButtonBar_Button').item(1)
        if (!btnAll) {
            if (attempt < 3) {
                setTimeout(() => processGame(standalone,attempt + 1), 1000);
                return;
            }
        }


        const league = normaliseLeague(document.querySelector('.sph-Breadcrumb').innerText.substring(9));
        const teams = document.querySelector('.sph-EventHeader_Label span').innerText.split(' v ');
        const matchTime = document.querySelector('.sph-ExtraData_TimeStamp')?.innerText || null;
        let oddsEls = [];
        if (btnAll) {
            btnAll.click()
            oddsEls = btnAll.parentNode.parentNode.parentNode.parentNode.querySelectorAll('.gl-Market_General-cn1');
        }

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
                matchTime: matchTime ? Date.parse(matchTime + " 2022") : null,
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

            chrome.storage.local.get(scrapeStateKey, storage => {
                const state = storage[scrapeStateKey]
                chrome.storage.local.set(
                    { bet365Data: data, [scrapeStateKey]: { ...state, gameIndex: (state.gameIndex || 0) + 1 } },
                    () => {
                        chrome.runtime.sendMessage({ action: Action.SCRAPED_GAME, bookie: Bookie.BET365, game })
                        chrome.runtime.sendMessage({action: Action.SCRAPE_STATE_UPDATED, bookie: Bookie.BET365})

                        if (standalone) {
                            chrome.runtime.sendMessage({ action: Action.REMOVE_TAB })
                        } else {
                            window.history.back()
                        }
                    }
                )
            })
        })
    }
})()