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

function getRandomColor() {
    var rand = Math.floor(Math.random() * 0xFFFFFF).toString(16);
    if (rand.length == 6) {
        return rand;
    } else {
        return getRandomColor();
    }
}

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
                wordStatus.text("(已导入)")
                if (!!color) {
                    wordStatus.css("color", "#" + color);
                }
                if (!!num) {
                    wordStatus.text("(已导入" + num + "个词)")
                }
            } else {
                wordStatus.text("(未导入)")
            }
        })
    }

}

function initSettings() {
    chrome.storage.local.get([
        "ttsToggle"
        , "ttsVoices"
        , "toggle"
    ], function (result) {
        toggle.prop("checked", result.toggle)
        //发音开关
        ttsToggle.prop("checked", result.ttsToggle)
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

initSettings()