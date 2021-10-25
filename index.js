(() => {
    chrome.storage.local.get('bet365Data', storage => {
        //document.getElementById('bet365').innerHTML = JSON.stringify(storage.bet365Data, null, 2)
        document.getElementById('bet365').innerHTML = JSON.stringify(Object.keys(storage.bet365Data), null, 2);
    })
})()