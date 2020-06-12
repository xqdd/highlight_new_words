const HOST = "http://127.0.0.1:9332";

function initSettings() {
    chrome.storage.local.set({
        toggle: true,
        ttsToggle: true,
        ttsVoices: {
            lang: "en",
        },
        highlightBackground: "#FFFF0010",
        highlightText: "",
        bubbleBackground: "#FFE4C4",
        bubbleText: "",
        syncTime: 0,
        autoSync: true,
        cookie: false,
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
chrome.storage.local.get(["ttsVoices", "syncTime", "autoSync", "cookie"], function (result) {
    if (!result.ttsVoices) {
        initSettings();
    }
    if (!!result.cookie && result.autoSync && (new Date().getTime() - result.syncTime) > 60 * 60 * 24 * 1000) {
        console.log("同步中。。。")
        sync(() => {
        })
    }
});

let sync = function (sendResponse) {
    getCookie(cookie => {
        axios.get("http://dict.youdao.com/wordbook/webapi/words?limit=100000000&offset=0").then(({data: {data}}) => {
            let wordInfos = {};
            if (data.total === 0) {
                sendResponse("同步成功，但生词本无内容，若实际有内容，请尝试重新登录");
                return
            }
            data.itemList.forEach(w => {
                wordInfos[w.word.toLowerCase()] = w
            });
            chrome.storage.local.set({newWords: {wordInfos}, cookie, syncTime: new Date().getTime()}, () => {
                sendResponse("同步成功");
            });
        }).catch(e => {
            sendResponse("网络错误或服务器出错，请检查网络后再试或重新登录");
        });
    })
};
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let needResponse = true;
    if (request.type === "tts") {
        if (!!request.word && typeof request.word === "string") {
            chrome.storage.local.get(["ttsToggle", "ttsVoices"], function (result) {
                if (result.ttsToggle) {
                    chrome.tts.speak(request.word, {...result.ttsVoices});
                }
            })
        }
    } else if (request.type === "resetSettings") {
        initSettings()
    } else if (request.type === "setStyle") {
        chrome.storage.local.get(["highlightBackground", "highlightText", "bubbleBackground", "bubbleText"], function (result) {
            setStyle(result);
        })
    } else if (request.type === "sync") {
        needResponse = false;
        sync(sendResponse);
    } else if (request.type === "delete") {
        needResponse = false;
        let wordData = request.wordData;
        let word = wordData.word;
        axios.get(`http://dict.youdao.com/wordbook/webapi/delete?itemId=${wordData.itemId}`)
        chrome.storage.local.get("newWords", function (result) {
            let wordInfos = result.newWords.wordInfos;
            delete wordInfos[word.toLowerCase()];
            chrome.storage.local.set({newWords: {wordInfos}});
            sendResponse("删除成功，刷新页面后生效");
        });
    }
    if (needResponse) {
        sendResponse();
    }
    return true;
    // sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
});


function getCookie(callback) {
    chrome.storage.local.get("cookie", function (result) {
        if (!!result.cookie) {
            callback(result.cookie)
        } else {
            chrome.cookies.getAll({url: "http://dict.youdao.com/wordbook/wordlist"}, cookies => {
                cookies.map(c => c.name + "=" + c.value).join(";")
                callback(cookies.map(c => c.name + "=" + c.value).join(";"))
            })
        }
    });
}

