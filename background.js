chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        console.log("EXTENSION"+details)
        if(details.url == "https://cloud.boosteroid.com/static/streaming/streaming.js?version=v_4.3.11" )
            return {redirectUrl: "https://pastebin.com/raw/6nBPUwrV" };
    },
    {urls: ["https://cloud.boosteroid.com/*"]},
    ["blocking"]);
