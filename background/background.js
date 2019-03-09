function initSettings() {
    chrome.storage.sync.set({
        toggle: true,
        ttsToggle: true,
        ttsVoices: {
            lang: "en",
        },
        highlightBackground: "#FFFF0020",
        highlightText: "",
        bubbleBackground: "#FFE4C4",
        bubbleText: "",
    })
}

function setStyle(result) {
    let highlightCss = ".xqdd_highlight_new_word {background-color: " + result.highlightBackground + ";";
    let bubbleCss = ".xqdd_bubble {background-color: " + result.bubbleBackground + ";";
    if (result.highlightText.trim() !== "") {
        highlightCss += "color:" + result.highlightText + ";";
        bubbleCss += "color:" + result.bubbleText + ";";
    }
    highlightCss += "}";
    bubbleCss += "}";
    chrome.tabs.insertCSS(null, {code: highlightCss + bubbleCss});
}

//初始化配置
chrome.storage.sync.get("settings", function (result) {
    if (!result.settings) {
        initSettings();
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "tts") {
        if (!!request.word && typeof request.word === "string") {
            chrome.storage.sync.get(["ttsToggle", "ttsVoices"], function (result) {
                if (result.ttsToggle) {
                    chrome.tts.speak(request.word, {...result.ttsVoices});
                }
            })
        }
    } else if (request.type === "resetSettings") {
        initSettings()
    } else if (request.type === "setStyle") {
        chrome.storage.sync.get(["highlightBackground", "highlightText", "bubbleBackground", "bubbleText"], function (result) {
            setStyle(result);
        })
    }
    sendResponse();
    // sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
});


