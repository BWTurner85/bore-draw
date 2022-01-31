import {Action, Bet365, Bookie} from "./constants";
import {debug} from "./logger";
import {awaitPageLoad} from "./util";

const scrapeStateKey = 'scrapeState' + Bookie.BET365;

(() => {
    if (location.href === Bet365.SOCCER_HOMEPAGE) {
        debug(`${location.href} identified as the soccer home page`)
        awaitPageLoad('.sm-SplashMarketGroup', scrapeGames)
    } else if (location.href.startsWith(Bet365.GAME_URL_PREFIX)) {
        debug(`${location.href} identified as a soccer game page`)
        awaitPageLoad('.gl-MarketGrid', processGame)
    } else if (location.href.startsWith(Bet365.LEAGUE_URL_PREFIX)) {
        debug(`${location.href} identified as a soccer league page`)
        awaitPageLoad('.rcl-ParticipantFixtureDetails_TeamNames', processLeague);
    } else {
        debug("Loaded an unrecognised page - backtracking")
        window.history.back();
    }

    function sleep(delay) {
        return new Promise(resolve => setTimeout(resolve, delay))
    }

    /**
     * Search for leagues on the soccer homepage
     *
     * @returns [] An array of elements each representing a soccer league
     */
    function findLeagues() {
        const marketGroups = document.querySelectorAll(".sm-SplashMarketGroup");
        if (!marketGroups) {
            return [];
        }

        let leagueGroup = Array.from(marketGroups).find(group => {
            // Bet365.LEAGUE_GROUP_TITLE
            return (group.querySelector('.sm-SplashMarketGroupButton_Text').innerText === 'Competitions');
        })

        const leagueSections = leagueGroup.querySelectorAll('.sm-SplashMarket_Header');
        leagueSections.forEach(section => {
            const title = section.querySelector('.sm-SplashMarket_Title').innerText
            if (title === 'Popular' && section.classList.contains('sm-SplashMarket_HeaderOpen')) {
                section.click()
            } else if (!section.classList.contains('sm-SplashMarket_HeaderOpen')) {
                section.click()
            }
        })

        return leagues
    }

    /**
     * Scrape all soccer games
     */
    function scrapeGames() {
        chrome.storage.local.get(scrapeStateKey, storage => {
            const state = storage[scrapeStateKey]
            const nextIdx = state.lastLeague === undefined ? 0 : state.lastLeague + 1
            const leagues = findLeagues()

            debug("Next league index: ", nextIdx)
            if (leagues.item(nextIdx)) {
                chrome.storage.local.set(
                    { [scrapeStateKey]: { ...state, lastLeague: nextIdx } },
                    () => leagues.item(nextIdx).click()
                )
            } else {
                chrome.runtime.sendMessage({
                    action: Action.COMPLETED_SCRAPE,
                    bookie: Bookie.BET365
                })
            }
        })
    }

    /**
     *  Process a league page clicking through to each game to process
     */
    function processLeague() {
        debug("Processing soccer league page")
        chrome.storage.local.get('lastGame', storage => {
            const nextIdx = storage.lastGame === undefined ? 0 : storage.lastGame + 1;
            //const games = document.querySelectorAll('.rcl-ParticipantFixtureDetails_TeamNames');
            const games = document.querySelectorAll('div.rcl-ParticipantFixtureDetails:not(.rcl-ParticipantFixtureDetails_NoAdditionalMarkets)')
            if (games.item(nextIdx)) {
                chrome.storage.local.set(
                    { lastGame: nextIdx},
                    () => games.item(nextIdx).click()
                )
            } else {
                chrome.storage.local.set(
                    { lastGame: -1 },
                    () => location.href = Bet365.SOCCER_HOMEPAGE
                )
            }
        })
    }

    /**
     * Process a game page - collecting all correct score odds
     */
    function processGame() {
        debug("Processing game page")
        const btnAll = document.querySelectorAll('.gl-ButtonBar_Button').item(1)
        if (!btnAll) {
            window.history.back();
            return;
        }

        btnAll.click()

        const league = document.querySelector('.sph-Breadcrumb').innerText.substring(9);
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

            // TODO: Could reduce page loads by clicking through to the next game directly from here
            chrome.runtime.sendMessage({ bookie: 'bet365', game })

            chrome.storage.local.set({ bet365Data: data }, () => window.history.back())
        })
    }
})()