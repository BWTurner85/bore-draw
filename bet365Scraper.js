(() => {
    const LEAGUE_GROUP_TITLE = 'Competitions'
    const SOCCER_HOMEPAGE_URL = 'https://www.bet365.com.au/#/AS/B1/'
    const SOCCER_LEAGUE_URL_PREFIX = 'https://www.bet365.com.au/#/AC/B1/C1/'
    const SOCCER_GAME_URL_PREFIX = 'https://www.bet365.com.au/#/AC/B1/C1/D8/'
    const IN_PLAY_PREFIX = 'https://www.bet365.com.au/#/IP/';

    // If we loaded the soccer homepage kick off scraping
    if (location.href === SOCCER_HOMEPAGE_URL) {
        console.log("Soccer homepage loading. Time to scrape")
        awaitPageLoad('.sm-SplashMarketGroup', scrapeGames)
    } else if (location.href.startsWith(SOCCER_GAME_URL_PREFIX)) {
        console.log("Soccer game page")
        awaitPageLoad('.gl-MarketGrid', processGame)
    } else if (location.href.startsWith(SOCCER_LEAGUE_URL_PREFIX)) {
        awaitPageLoad('.rcl-ParticipantFixtureDetails_TeamNames', processLeague);
    } else if (location.href.startsWith(IN_PLAY_PREFIX)) {
        console.log("In play page");
        window.history.back();
    } else {
        console.log("Random unknown page")
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
            return (group.querySelector('.sm-SplashMarketGroupButton_Text').innerText === LEAGUE_GROUP_TITLE);
        })

        return leagueGroup.querySelectorAll(".sm-CouponLink_Title");
    }

    /**
     * Scrape all soccer games
     */
    function scrapeGames() {
        chrome.storage.local.get(['lastLeague', 'bet365Data'], storage => {
            const nextIdx = storage.lastLeague === undefined ? 0 : storage.lastLeague + 1
            const leagues = findLeagues();

            console.log("Next league index: " + nextIdx);
            if (leagues.item(nextIdx)) {
                chrome.storage.local.set(
                    { lastLeague: nextIdx },
                    () => leagues.item(nextIdx).click()
                )
            } else {
                chrome.storage.local.set(
                    { lastLeague: -1 },
                    () => {
                        console.log("DONE MOTHER FUCKER")
                        console.log(storage.bet365Data);
                    }
                )
            }
        })
    }

    /**
     * Process a league page clicking through to each game to process
     */
    function processLeague() {
        console.log("Processing soccer league page")
        chrome.storage.local.get('lastGame', storage => {
            const nextIdx = storage.lastGame === undefined ? 0 : storage.lastGame + 1;
            const games = document.querySelectorAll('.rcl-ParticipantFixtureDetails_TeamNames');

            if (games.item(nextIdx)) {
                chrome.storage.local.set(
                    { lastGame: nextIdx},
                    () => games.item(nextIdx).click()
                )
            } else {
                chrome.storage.local.set(
                    { lastGame: -1 },
                    () => location.href = SOCCER_HOMEPAGE_URL
                )
            }
        })
    }

    /**
     * Process a game page - collecting all correct score odds
     */
    function processGame() {
        console.log("Processing game page")
        const btnAll = document.querySelectorAll('.gl-ButtonBar_Button').item(1)
        if (!btnAll) {
            window.history.back();
            return;
        }

        btnAll.click()

        const league = document.querySelector('.sph-Breadcrumb').innerText.substring(9);
        const teams = document.querySelector('.sph-EventHeader_Label span').innerText.split(' v ');
        const oddsEls = btnAll.parentNode.parentNode.parentNode.parentNode.querySelectorAll('.gl-Market_General-cn1');

        chrome.storage.local.get([ 'bet365Data' ], storage => {
            let scoreData = [];

            Array.from(oddsEls).forEach(oddsEl => {
                try {
                    const score = oddsEl.querySelector('.gl-ParticipantCentered_Name').innerText

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

            const game = { league: league, teamA: teams[0], teamB: teams[1], scores: scoreData }
            data[league].push(game);
            console.log(game);

            // TODO: Could reduce page loads by clicking through to the next game directly from here
            chrome.storage.local.set({ bet365Data: data }, () => window.history.back())
        })
    }

    /**
     * Function to wait for an ajax page to be loaded before running a callback
     *
     * @param {string} selector         A query selector that indicates the content we care about
     *                                      has been loaded into the page
     * @param {function} callback       The callback to be called once the page has been loaded
     * @param {number} intervalDuration Duration to use for the interval
     */
    function awaitPageLoad(selector, callback, intervalDuration = 1000) {
        const intervalId = setInterval(
            () => {
                if (document.querySelector(selector)) {
                    clearInterval(intervalId)
                    callback()
                }
            },
            intervalDuration
        )
    }
})()