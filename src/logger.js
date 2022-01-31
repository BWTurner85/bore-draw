export function debug(...messages) {
    console.debug("[Borer][" + (new Date()).toLocaleTimeString() + "] ", ...messages)
}
