$("#file").on("change", function () {
    var reader = new FileReader()
    reader.onload = function () {
        var xml = $($.parseXML(this.result))
        var wordList = [];
        var wordInfos = {}
        var transList = [];
        var phoneticList = [];
        var originWordList = [];
        xml.find("item").each(function (i, val) {
            var node = $(val)
            var word = node.find("word").text()
            originWordList.push(word)
            wordList.push(word.toLowerCase())
            wordInfos[word.toLowerCase()] = {trans: node.find("trans").text(), phonetic: node.find("phonetic").text()}
        })
        chrome.storage.local.set({newWords: {wordList, originWordList, wordInfos}})
        chrome.notifications.create({
            type: "basic",
            title: "test",
            message: "解析单词本成功"
        })

    }
    reader.readAsText(this.files[0])
})
