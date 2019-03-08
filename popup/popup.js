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

function initStyle() {
    chrome.storage.sync.get([
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

function initSettings() {
    chrome.storage.sync.get([
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
                    if (voice.lang.toLowerCase().startsWith("en")) {
                        let option = $("<option>")
                            .text((index++)
                                + ":" + voice.voiceName
                                + "，" + voice.lang
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
            });
        //高亮
        initStyle();
    })
}


$("#file").on("change", function () {
    var reader = new FileReader()
    reader.onload = function () {
        var xml = $($.parseXML(this.result))
        var wordInfos = {}
        var transList = [];
        var phoneticList = [];
        // var originWordList = [];
        // var wordList = [];
        xml.find("item").each(function (i, val) {
            var node = $(val)
            var word = node.find("word").text()
            // originWordList.push(word)
            // wordList.push(word.toLowerCase())
            wordInfos[word.toLowerCase()] = {trans: node.find("trans").text(), phonetic: node.find("phonetic").text()}
        })
        chrome.storage.local.set({newWords: {wordInfos}})
        //提示导入成功
        // chrome.notifications.create({
        //     type: "basic",
        //     title: "test",
        //     message: "解析单词本成功"
        // })
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {type: "importSuccess"});
        });
    }
    reader.readAsText(this.files[0])
})


ttsVoices.on("click", function () {
    let ttsVoices = JSON.parse($("#tts_voices option:selected").val());
    chrome.storage.sync.set({ttsVoices})
})
ttsToggle.on("click", function () {
    chrome.storage.sync.set({ttsToggle: ttsToggle.prop("checked")})
})
toggle.on("click", function () {
    chrome.storage.sync.set({toggle: toggle.prop("checked")})
})
highlightText.on("input", function () {
    chrome.storage.sync.set({highlightText: highlightText.val()}, function () {
        initStyle()
    })
})
highlightBackground.on("input", function () {
    chrome.storage.sync.set({highlightBackground: highlightBackground.val()}, function () {
        initStyle()
    })
})
bubbleText.on("input", function () {
    chrome.storage.sync.set({bubbleText: bubbleText.val()}, function () {
        initStyle()
    })
})
bubbleBackground.on("input", function () {
    chrome.storage.sync.set({bubbleBackground: bubbleBackground.val()}, function () {
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

initSettings()