(() => {
    if (/^https:\/\/www.betfair.com.au\/exchange\/plus\/football\/market\//.test(location.href)) {
        console.log("processing game");
        awaitPageLoad('bf-mini-market-container', processGame)
    }

    if (!/^https:\/\/www.betfair.com.au\/exchange\/plus\/football(\/\d+)?$/.test(location.href)) {
        return;
    }

    const page = location.href.split('/').pop === 'football' ? 1 : location.href.split('/').pop;
    if (page === 1) {
        chrome.storage.local.set({ betfairGameLinks: [] });
    }

    awaitPageLoad('.content-page-center-column tr .mod-link', () => {
        const games = document.querySelectorAll('.content-page-center-column tr');
        let gameLinks = []
        Array.from(games).forEach(game => {
            // Skip non game rows
            if (!game.querySelector('.coupon-runners')) {
                return;
            }

            // Skip ames that are in play
            if (game.querySelector('.in-play')) {
                return;
            }

            const names = game.querySelectorAll('.runners .name');
            const teamA = names[0].innerText;
            const teamB = names[1].innerText;
            const link = game.querySelector('a.mod-link').href
            console.log(`${teamA} v ${teamB}: ${link}`)
            gameLinks.push(link);
        })

        chrome.storage.local.get('betfairGameLinks', storage => {
            chrome.storage.local.set({ betfairGameLinks: storage.betfairGameLinks.concat(gameLinks) })
        })
        const nextLink = document.querySelector('.coupon-page-navigation__link--next')
        if (nextLink.href && nextLink.href !== location.href) {
            location.href = nextLink.href ;
        } else {
            chrome.runtime.sendMessage( {action: 'processBetfairGame', index: 0 })
        }
    })

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

    function processGame() {
        const markets = document.querySelectorAll('bf-mini-market-container');

        const correctScoreMarket = Array.from(markets).find(
            market => market.querySelector('.market-name-label').innerText === 'Correct Score'
        );

        Array.from(correctScoreMarket.querySelectorAll('.runner-line')).forEach(scoreLine => {
            const score = scoreLine.querySelector('.runner-name').innerText;
            const layOdds = scoreLine.querySelector('button.lay .bet-button-price').innerText;
            const liquidity = scoreLine.querySelector('button.lay .bet-button-size').innerText.replace('$', '');

            console.log(score, layOdds, liquidity);
        })
    }
})()
