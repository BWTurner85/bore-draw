import {debug} from "./logger";
import { leagueMap } from "./data/leagueMapping";
/**
 * Betfair loads the left hand navigation via ajax. This function lets us wait until a given type
 * of link appears to have been fully loaded before proceeding with a required action
 *
 * @param selector
 * @param callback
 * @param {int} interval    Milliseconds between checks
 * @param {int} maxAttempts Number of times to check for elements before triggering the timeoutCallback if none are present
 * @param timeoutCallback
 */
export function awaitMultiElementLoad(selector, callback, interval = 500, maxAttempts = 0, timeoutCallback = null) {
    let elements = []
    let attempts = 0;

    const intervalId = setInterval(() => {
        const prevCount = elements ? elements.length : -1

        if (typeof selector === 'function') {
            elements = selector()
        } else {
            elements = Array.from(document.querySelectorAll(selector))
        }

        if (elements.length > 0 && elements.length === prevCount) {
            clearInterval(intervalId)
            callback();
        } else if (maxAttempts > 0 && attempts > maxAttempts) {
            clearInterval(intervalId)
            typeof timeoutCallback === 'function' ? timeoutCallback() : callback()
        }

        attempts++;
    }, interval)
}


/**
 * Function to wait for an ajax page to be loaded before running a callback
 *
 * @param {string} selector         A query selector that indicates the content we care about
 *                                      has been loaded into the page
 * @param {function} callback       The callback to be called once the page has been loaded
 * @param {int} timeout
 * @param {function} timeoutCallback
 */
export function awaitPageLoad(selector, callback, timeout= 0, timeoutCallback = null) {
    let attempts = 0;
    const intervalId = setInterval(
        () => {
            if (document.querySelector(selector)) {
                clearInterval(intervalId)
                callback()
            } else if (timeout > 0 && attempts > timeout) {
                clearInterval(intervalId)
                timeoutCallback ? timeoutCallback() : callback()
            }

            attempts++;
        },
        1000
    )
}

/**
 * Update a value in localstorage by merging the provided values into the provided object key.
 *
 * If the value exists in storage already the values will be added to it,
 * replacing existing values with the same keys where relevant.
 * If the value does not exist it is created
 *
 * @param objectKey The key of the object stored in local storage
 * @param values    An object containing the values to be updated
 * @param callback  An optional callback to call after values have been updated
 */
export function upsertToLocalStorageObject(objectKey, values, callback = null) {
    chrome.storage.local.get(objectKey, storage => {
        chrome.storage.local.set(
            {
                [objectKey]: {
                    ...storage[objectKey] || {},
                    ...values
                }
            },
            () => {
                if (callback !== null) {
                    callback()
                }
            }
        )
    })
}

/**
 * Normalise a league name according to defined league name normalisers
 *
 * @param leagueName
 * @returns {*}
 */
export function normaliseLeague(leagueName)
{
    if (!leagueName) {
        return leagueName
    }

    leagueMap.normalisers.forEach(normaliser => leagueName = leagueName.replace(normaliser.find,normaliser.replace))

    return leagueName
}