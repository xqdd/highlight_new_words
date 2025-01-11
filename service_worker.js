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
        //生词本类型，0有道,1欧路
        dictionaryType: 0,
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

    // 获取所有标签页
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(function (tab) {
            // 为每个标签页插入样式
            chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                css: highlightCss + bubbleCss
            });
        });
    });
}

//初始化配置
chrome.storage.local.get(["ttsVoices", "syncTime", "autoSync", "cookie", "dictionaryType"], function (result, b, c) {
    console.log(result)
    console.log(b)
    console.log(c)
    if (!result.ttsVoices) {
        initSettings();
    }
    if (result.autoSync && (new Date().getTime() - result.syncTime) > 60 * 60 * 24 * 1000) {
        console.log("同步中。。。")
        sync((msg) => {
            console.log(msg)
        }, result.dictionaryType)
    }
});

function syncSuccess(wordInfos, cookie, sendResponse, dictionaryType) {
    chrome.storage.local.set({ newWords: { wordInfos }, dictionaryType, cookie, syncTime: new Date().getTime() }, () => {
        sendResponse("同步成功");
    });
}

let sync = function (sendResponse, dictionaryType) {
    //同步有道词典
    if (dictionaryType == 0) {
        getCookie(cookie => {
            fetch("http://dict.youdao.com/wordbook/webapi/words?limit=100000000&offset=0")
                .then(res => res.json())
                .then(({ data }) => {
                    console.log(data)

                    let wordInfos = {};
                    if (data.total === 0) {
                        sendResponse("同步成功，但生词本无内容，若实际有内容，请尝试重新登录");
                        return
                    }
                    data.itemList.forEach(w => {
                        wordInfos[w.word.toLowerCase()] = w
                    });
                    syncSuccess(wordInfos, cookie, sendResponse, dictionaryType);
                }).catch(e => {
                    sendResponse("网络错误或服务器出错，请检查网络后再试或重新登录");
                });
        })
    }
    //同步欧路词典
    else if (dictionaryType == 1) {
        fetch("https://my.eudic.net/StudyList/WordsDataSource?start=0&length=100000000")
            .then(res => res.json())
            .then(({ data }) => {
                if (data) {
                    let wordInfos = {};
                    data.forEach(item => {
                        wordInfos[item.uuid.toLowerCase()] = {
                            phonetic: item.phon,
                            trans: item.exp,
                            word: item.uuid,
                            link: item.word,
                        }
                    });
                    syncSuccess(wordInfos, null, sendResponse, dictionaryType);
                } else {
                    sendResponse("同步失败，请尝试重新登录");
                }
            }).catch(e => {
                sendResponse("网络错误或服务器出错，请检查网络后再试或重新登录");
            });
    }
};
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let needResponse = true;
    if (request.type === "tts") {
        if (!!request.word && typeof request.word === "string") {
            chrome.storage.local.get(["ttsToggle", "ttsVoices"], function (result) {
                if (result.ttsToggle) {
                    chrome.tts.speak(request.word, { ...result.ttsVoices });
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
        sync(sendResponse, request.dictionaryType);
    } else if (request.type === "delete") {
        needResponse = false;
        let wordData = request.wordData;
        let word = wordData.word;
        chrome.storage.local.get(["dictionaryType"], function (result) {
            if (result.dictionaryType == 0) {
                fetch(`http://dict.youdao.com/wordbook/webapi/delete?itemId=${wordData.itemId}`)
            } else if (result.dictionaryType == 1) {
                fetch("https://dict.eudic.net/Dicts/SetStarRating", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ rating: -1, word, lang: 'en' })
                })
            }
        })
        chrome.storage.local.get("newWords", function (result) {
            let wordInfos = result.newWords.wordInfos;
            delete wordInfos[word.toLowerCase()];
            chrome.storage.local.set({ newWords: { wordInfos } });
            sendResponse("删除成功，刷新页面后生效");
        });
    } else if (request.type === "count") {
        const id = sender.tab.id
        if (!wordCount[id]) {
            wordCount[id] = new Set()
        }
        const word = request.word.toLowerCase()
        if (!wordCount[id].has(word)) {
            wordCount[id].add(word)
            updateWordCount(id)
        }
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
            chrome.cookies.getAll({ url: "http://dict.youdao.com/wordbook/wordlist" }, cookies => {
                cookies.map(c => c.name + "=" + c.value).join(";")
                callback(cookies.map(c => c.name + "=" + c.value).join(";"))
            })
        }
    });
}


//处理单词计数
let wordCount = {}
let wordCountUrl = {}
chrome.tabs.onUpdated.addListener(function (id, info, tab) {
    if (wordCountUrl[id] !== tab.url) {
        wordCountUrl[id] = tab.url
        if (wordCount[id]) {
            wordCount[id].clear();
        } else {
            wordCount[id] = new Set()
        }
        updateWordCount(id)
    }
    if (info.status === "complete") {
        updateWordCount(id)
    }
})


function updateWordCount(tabId) {
    if (wordCount[tabId]) {
        const count = wordCount[tabId].size;

        chrome.action.getBadgeText({ tabId }, function (countStr) {
            if (count === 0 && (!countStr || countStr === "")) {
                // 如果当前计数为0且徽章文字为空，则什么都不做
                return;
            }
            // 将徽章文字设置为当前的单词计数
            chrome.action.setBadgeText({
                text: count.toString(),
                tabId
            });
        });
    }
}

chrome.tabs.onRemoved.addListener(function (tabId) {
    if (wordCount[tabId]) {
        wordCount[tabId].clear()
        delete wordCount[tabId]
        delete wordCountUrl[tabId]
    }
})
