import {Betfair, Bookie, Storage} from "./constants";
import { leagueMap } from "./data/leagueMapping";
import {debug} from "./logger";

/**
 * Merge league data and run the numbers
 *
 * @param bet365Data
 * @param betfairData
 * @returns {*[]}
 */
export function mergeLeagueData(bet365Data, betfairData) {
    const commonLeagues = getCommonLeagues(bet365Data, betfairData)
    const combinedGames = mergeGames(commonLeagues, bet365Data, betfairData)

    console.log(combinedGames);
    for (let league in combinedGames) {
        combinedGames[league].forEach(game => {
            calculateGame(game)
        })
    }

    return combinedGames;
}

/**
 * Run the numbers for a given game. Determine outcomes for all available scores.
 *
 * @param {object} game
 */
export function calculateGame(game) {
    debug("Lets run the numbers for: ", game)
    const stake = localStorage.getItem(Storage.BACK_STAKE)
    const commissionDiscount = localStorage.getItem(Storage.COMMISSION_DISCOUNT)
    const commission = Betfair.COMMISSION * ((100 - commissionDiscount) / 100)
    const retention = localStorage.getItem(Storage.retention);

    game.scores.forEach(score => {
        const backOdds = score.back_odds;
        const layOdds = score.lay_odds;
        const refundOdds = score.bore_draw_odds;

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