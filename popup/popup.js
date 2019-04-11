let ttsVoices = $("#tts_voices");
let ttsToggle = $("#tts_toggle");
let highlightBackground = $("#highlight_background");
let highlightText = $("#highlight_text");
let highlightTemplate = $("#highlight_template");
let bubbleBackground = $("#bubble_background");
let bubbleTemplate = $("#bubble_template");
let bubbleText = $("#bubble_text");
let toggle = $("#toggle");
let reset = $("#reset");
let wordStatus = $("#word_status");
let xmlFile = $("#file");
let syncButton = $("#sync");
let autoSync = $("#auto_sync");
let loginATag = $("#login");

//日期加强

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1,                 //月份
        "d+": this.getDate(),                    //日
        "h+": this.getHours(),                   //小时
        "m+": this.getMinutes(),                 //分
        "s+": this.getSeconds(),                 //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds()             //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}


function getRandomColor() {
    var rand = Math.floor(Math.random() * 0xFFFFFF).toString(16);
    if (rand.length == 6) {
        return rand;
    } else {
        return getRandomColor();
    }
}

//单词样式相关
function initStyle() {
    chrome.storage.local.get([
        "highlightBackground"
        , "highlightText"
        , "bubbleBackground"
        , "bubbleText"], function (result) {
        highlightBackground.val(result.highlightBackground)
        highlightText.val(result.highlightText)
        highlightTemplate.css("background-color", result.highlightBackground)
        if (result.highlightText.trim() !== "") {
            highlightTemplate.css("color", result.highlightText)
        }
        bubbleBackground.val(result.bubbleBackground)
        bubbleText.val(result.bubbleText)
        bubbleTemplate.css("background-color", result.bubbleBackground)
        if (result.bubbleText.trim() !== "") {
            bubbleTemplate.css("color", result.bubbleText)
        }
        chrome.runtime.sendMessage({type: "setStyle"})
    })
}


function updateWordStatus(color, err, num) {
    if (err) {
        wordStatus.text("(导入失败)")
        wordStatus.css("color", "#" + color);
    } else {
        chrome.storage.local.get("newWords", function (result) {
            if (result.newWords) {
                wordStatus.text("(已导入" + Object.keys(result.newWords.wordInfos).length + "个词)")
                if (!!color) {
                    wordStatus.css("color", "#" + color);
                }
                if (!!num) {
                    wordStatus.text("(已导入" + Object.keys(result.newWords.wordInfos).length + "个词)")
                }
            } else {
                wordStatus.text("(未导入单词)")
            }
        })
    }

}

//配置
function initSettings() {
    chrome.storage.local.get([
        "ttsToggle"
        , "ttsVoices"
        , "autoSync"
        , "syncTime"
        , "cookie"
        , "toggle"
    ], function (result) {
        //总开关
        toggle.prop("checked", result.toggle)
        //发音开关
        ttsToggle.prop("checked", result.ttsToggle)
        //自动同步开关
        autoSync.prop("checked", result.autoSync)
        //是否有cookie
        if (!!result.cookie) {
            loginATag.css("display", "none")
            syncButton.text("同步单词（上次同步于 " + (new Date(result.syncTime)).format("yyyy-MM-dd hh:mm:ss") + " ）")
        }
        //发音人员
        chrome.tts.getVoices(
            function (voices) {
                let oldVoice = result.ttsVoices
                let index = 1;
                let isSelected = false
                ttsVoices.empty()
                for (let i = 0; i < voices.length; i++) {
                    let voice = voices[i];
                    delete voice.eventTypes;
                    if (!voice.lang
                        || voice.lang.toLowerCase().startsWith("en")
                        || voice.lang.toLowerCase().startsWith("xx")) {
                        let option = $("<option>")
                            .text((index++)
                                + ":" + voice.voiceName
                                + (!voice.lang || voice.lang.toLowerCase().startsWith("xx")
                                    ? "" : "，" + voice.lang)
                                + (voice.remote ? "，远程源" : "")
                            );
                        delete voice.remote
                        option.val(JSON.stringify(voice))
                        if (!isSelected && JSON.stringify(oldVoice) === JSON.stringify(voice)) {
                            option.attr("selected", true)
                            isSelected = true
                        }
                        ttsVoices.append(option);
                    }
                }
                if (ttsVoices.children().length == 0) {
                    ttsVoices.append($("<option>无</option>"));
                }
            });
        //高亮
        initStyle();
        updateWordStatus()
    })
}


xmlFile.on("change", function () {
    let file = this.files[0]
    if (file) {
        let reader = new FileReader()
        reader.onload = function () {
            try {
                let xml = $($.parseXML(this.result))
                let wordInfos = {}
                let transList = [];
                let phoneticList = [];
                // var originWordList = [];
                // var wordList = [];
                var items = xml.find("item");
                items.each(function (i, val) {
                    let node = $(val)
                    let word = node.find("word").text()
                    // originWordList.push(word)
                    // wordList.push(word.toLowerCase())
                    wordInfos[word.toLowerCase()] = {
                        word,
                        trans: node.find("trans").text(),
                        phonetic: node.find("phonetic").text()
                    }
                })
                chrome.storage.local.set({newWords: {wordInfos}})
                //提示导入成功
                // chrome.notifications.create({
                //     type: "basic",
                //     title: "test",
                //     message: "解析单词本成功"
                // })
                updateWordStatus(getRandomColor(), false, items.length)
                // chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                //     chrome.tabs.sendMessage(tabs[0].id, {type: "importSuccess"});
                // });
            } catch (err) {
                updateWordStatus(getRandomColor(), true)
            } finally {
                xmlFile.val("");
            }
        }
        reader.readAsText(file)
    }
})


//事件监听
ttsVoices.on("click", function () {
    let val = $("#tts_voices option:selected").val();
    if (val && val !== "" && val !== "无") {
        let ttsVoices = JSON.parse(val);
        chrome.storage.local.set({ttsVoices})
    }
})
ttsToggle.on("click", function () {
    chrome.storage.local.set({ttsToggle: ttsToggle.prop("checked")})
})
toggle.on("click", function () {
    chrome.storage.local.set({toggle: toggle.prop("checked")})
})
autoSync.on("click", function () {
    chrome.storage.local.set({autoSync: autoSync.prop("checked")})
})
highlightText.on("input", function () {
    chrome.storage.local.set({highlightText: highlightText.val()}, function () {
        initStyle()
    })
})
highlightBackground.on("input", function () {
    chrome.storage.local.set({highlightBackground: highlightBackground.val()}, function () {
        initStyle()
    })
})
bubbleText.on("input", function () {
    chrome.storage.local.set({bubbleText: bubbleText.val()}, function () {
        initStyle()
    })
})
bubbleBackground.on("input", function () {
    chrome.storage.local.set({bubbleBackground: bubbleBackground.val()}, function () {
        initStyle()
    })
})
reset.on("click", function () {
    if (window.confirm("确认恢复默认设置？")) {
        chrome.runtime.sendMessage({type: "resetSettings"}, function () {
            initSettings()
        })
    }
})
$("#help").on("click", function () {
    chrome.tabs.create({url: 'https://github.com/XQDD/highlight_new_words'});
})
$("#moreVoices").on("click", function () {
    chrome.tabs.create({url: 'https://chrome.google.com/webstore/detail/speakit/pgeolalilifpodheeocdmbhehgnkkbak'});
})
$("#login").on("click", function () {
    chrome.tabs.create({url: 'http://dict.youdao.com/wordbook/wordlist'});
})
syncButton.click(function () {
    syncButton.attr("disabled", "")
    chrome.runtime.sendMessage({type: "sync"}, function (msg) {
        if (msg) {
            alert(msg)
        }
        initSettings()
        syncButton.removeAttr("disabled")
    })
})


initSettings()