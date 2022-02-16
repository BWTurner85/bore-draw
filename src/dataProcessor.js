import {Action, Bet365, Betfair, Bookie, dataKey, Defaults, Storage, Time} from "./constants";
import { leagueMap } from "./data/leagueMapping";
import {debug} from "./logger";

export function getUnmatchedGames(bookie) {
    debug("searching for unmatched games")
    const otherBookie = bookie === Bookie.BETFAIR ? Bookie.BET365 : Bookie.BETFAIR

    let unmatchedLeagues = []
    let unmatchedGames = {};

    chrome.storage.local.get([ dataKey(Bookie.BET365), dataKey(Bookie.BETFAIR) ], storage => {
        const bet365Data = storage[dataKey(Bookie.BET365)]
        const betfairData = storage[dataKey(Bookie.BETFAIR)]

        const source = bookie === Bookie.BET365 ? bet365Data : betfairData;
        const target = bookie === Bookie.BET365 ? betfairData : bet365Data;

        for (const league in source) {
            let targetLeague = league
            leagueMap.mappings.forEach(mapping => {
                if (mapping[bookie] === league) {
                    targetLeague = mapping[otherBookie]
                }
            })

            // Target league not found. entire league is unmatched
            if (!target[targetLeague]) {
                unmatchedLeagues.push(league)
                unmatchedGames[league] = source[league];
                continue;
            }

            // Target league exists. Check individual games
            source[league].forEach(game => {
                const targetGame = target[targetLeague].find(targetGame => {
                    // TODO: Team name normalisation will be required here.
                    return game.teamA.toLowerCase() === targetGame.teamA.toLowerCase() &&
                        game.teamB.toLowerCase() === targetGame.teamB.toLowerCase()
                })

                if (!targetGame) {
                    if (!unmatchedGames[league]) {
                        unmatchedGames[league] = []
                    }
                    unmatchedGames[league].push(game)
                }
            })
        }

        debug(bookie)
        chrome.runtime.sendMessage({
            action: Action.SEND_UNMATCHED_DATA,
            bookie,
            leagues: unmatchedLeagues,
            games: unmatchedGames
        })
    })
}

/**
 * Take a single game from one bookie and search for it in the other bookies data
 *
 * @param game
 */
export function processSingleGame(game) {
    const otherBookie = game.bookie === Bookie.BETFAIR ? Bookie.BET365 : Bookie.BETFAIR;

    chrome.storage.local.get(dataKey(otherBookie), storage => {
        const data = { [game.league]: [ game ] }
        const otherBookieData = storage[dataKey(otherBookie)] || {}
        let processed;

        if (game.bookie === Bookie.BETFAIR) {
            processed = processData(otherBookieData, data)
        } else {
            processed = processData(data, otherBookieData)
        }

        if (!Object.keys(processed)[0]) {
            return
        }

        const processedGame = processed[Object.keys(processed)[0]][0];
        if (processedGame.scrapeTimes[otherBookie] < Date.now() - 60 * Time.MINUTE) {
            // If the game was from bet365 and the betfair game is old trigger an update of it
            if (otherBookie === Bookie.BETFAIR) {
                chrome.runtime.sendMessage({
                    action: Action.SCRAPE_GAME,
                    bookie: otherBookie,
                    url: processedGame.urls[otherBookie]
                })
            }
        }
    })
}

/**
 * Merge league data and run the numbers
 *
 * @param bet365Data
 * @param betfairData
 * @param {boolean} notify
 * @returns {*[]}
 */
export function processData(bet365Data, betfairData, notify = true) {
    const commonLeagues = getCommonLeagues(bet365Data, betfairData)
    const combinedGames = mergeGames(commonLeagues, bet365Data, betfairData)

    for (let league in combinedGames) {
        combinedGames[league].forEach(game => {
            calculateGame(game, notify)
        })
    }

    return combinedGames;
}

/**
 * Run the numbers for a given game. Determine outcomes for all available scores.
 *
 * @param {object} game
 */
export function calculateGame(game, notify = true) {
    const stake = JSON.parse(localStorage.getItem(Storage.BACK_STAKE)) || Defaults.STAKE
    const commissionDiscount = JSON.parse(localStorage.getItem(Storage.COMMISSION_DISCOUNT)) || Defaults.COMMISSION_DISCOUNT
    const commission = Betfair.COMMISSION * ((100 - commissionDiscount) / 100)
    const retention = (JSON.parse(localStorage.getItem(Storage.RETENTION))  || Defaults.RETENTION) / 100

    game.scores.forEach(score => {
        const backOdds = score.back_odds;
        const layOdds = score.lay_odds;
        const refundOdds = score.bore_draw_odds;

        if (refundOdds === 0 || layOdds === 0) {
            score.arbable = false
            return
        }

        const layStake = (stake * backOdds) / (layOdds - commission) * (1 + (1 / layOdds) / 100);
        const boreDrawLayStake = stake * retention / refundOdds / (1 - commission)

        const outcomes = {
            backWins: {
                bookie: stake * (backOdds - 1),
                betfair: (-1 * layStake * (layOdds - 1)) + boreDrawLayStake,
                bonus: 0,
            },
            boreDraw: {
                bookie: -1 * stake,
                betfair: (layStake - (boreDrawLayStake * (refundOdds - 1))) * (1 - commission),
                bonus: stake * retention
            },
            other: {
                bookie: -1 * stake,
                betfair: (layStake + boreDrawLayStake) * (1 - commission),
                bonus: 0
            }
        }

        for (let outcome of Object.values(outcomes)) {
            outcome.total = outcome.bookie + outcome.betfair + outcome.bonus
        }

        const minOutcome = Math.min(outcomes['backWins'].total, outcomes['boreDraw'].total, outcomes['other'].total)
        score.arbable = minOutcome > 0
        score.outcomes = outcomes

        if (notify && score.arbable) {
            chrome.runtime.sendMessage({ action: Action.NOTIFY, game, score, stake, layStake, boreDrawLayStake })
        }
    })
}

/**
 * Decide on what label to use for a league
 *
 * @param league
 * @returns {*}
 */
function getLeagueLabel(league) {
    if (league.label) {
        return league.label;
    } else if (league[Bookie.BETFAIR]) {
        return league[Bookie.BETFAIR]
    } else {
        return league[Bookie.BET365]
    }
}

/**
 * Find Leagues that have data in both bet365 and betfair
 *
 * @param {object} bet365Data
 * @param {object} betfairData
 * @returns {array} An array of objects representing leagues that have data on both bookies
 */
function getCommonLeagues(bet365Data, betfairData) {
    let commonLeagues = []

    // Find cases where league names are identical
    Object.keys(bet365Data).forEach(league => {
        if (betfairData[league]) {
            commonLeagues.push({[Bookie.BET365]: league, [Bookie.BETFAIR]: league})
        }
    })

    // Check mappings of leagues that don't match even after applying normalisers
    leagueMap.mappings.forEach(mapping => {
        const bet365Map = mapping[Bookie.BET365]
        const betfairMap = mapping[Bookie.BETFAIR]

        if (bet365Data[bet365Map] && betfairData[betfairMap]) {
            commonLeagues.push({ [Bookie.BET365]: bet365Map, [Bookie.BETFAIR]:betfairMap })
        }
    })

    return commonLeagues;
}

/**
 *
 * @param {array} commonLeagues
 * @param {array} bet365Data
 * @param {array} betfairData
 * @returns {*[]}
 */
function mergeGames(commonLeagues, bet365Data, betfairData)
{
    let combinedData = []
    commonLeagues.forEach(league => {
        const leagueLabel = getLeagueLabel(league);

        const bet365LeagueData = bet365Data[league[Bookie.BET365]]
        const betfairLeagueData = betfairData[league[Bookie.BETFAIR]]

        if (!bet365LeagueData || !betfairLeagueData) {
            return
        }

        bet365LeagueData.forEach(bet365Game => {
            const betfairGame = betfairLeagueData.find(game => {
                // TODO: Team name normalisation will be required here.
                return game.teamA.toLowerCase() === bet365Game.teamA.toLowerCase() &&
                    game.teamB.toLowerCase() === bet365Game.teamB.toLowerCase()
            })

            if (!betfairGame) {
                return
            }

            if (!combinedData[leagueLabel]) {
                combinedData[leagueLabel] = [];
            }

            combinedData[leagueLabel].push({
                league: leagueLabel,
                teamA: betfairGame.teamA,
                teamB: betfairGame.teamB,
                matchTime: bet365Game.matchTime || betfairGame.matchTime,
                urls: { [Bookie.BET365]: bet365Game.url,  [Bookie.BETFAIR]: betfairGame.url },
                scrapeTimes: { [Bookie.BET365]: bet365Game.scrapeTime, [Bookie.BETFAIR]: betfairGame.scrapeTime },
                scores: mergeScores(bet365Game.scores, betfairGame.scores)
            })
        })
    })

    return combinedData
}

/**
 * Given an array of scores from each bookie, combine the ones that appear in both and discard everything else
 *
 * @param {array} bet365Scores
 * @param {array} betfairScores
 */
function mergeScores(bet365Scores, betfairScores) {
    let mergedScores = [];

    bet365Scores.forEach(bet365ScoreItem => {
        const normalisedScore = normaliseScore(bet365ScoreItem.score);
        const betfairScoreItem = betfairScores.find(
            item => normaliseScore(item.score) === normalisedScore
        )

        if (!betfairScoreItem) {
            return
        }

        mergedScores.push({
            score: normalisedScore,
            back_odds: bet365ScoreItem.odds,
            lay_odds: betfairScoreItem.odds,
            bore_draw_odds: betfairScores.find(item => normaliseScore(item.score) === '0-0').odds,
            liquidity: betfairScoreItem.liquidity
        })
    })

    return mergedScores;
}

/**
 * Normalise the label for a correct score market to a common form
 *
 * @param score
 * @returns {string}
 */
function normaliseScore(score)
{
    return score.replaceAll(' ', '');
}