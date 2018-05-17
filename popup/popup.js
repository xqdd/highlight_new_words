$("#file").on("change", function () {
    var reader = new FileReader()
    reader.onload = function () {
        var xml = $($.parseXML(this.result))
        var wordList = [];
        var transList = [];
        var phoneticList = [];
        var originWordList = [];
        xml.find("item").each(function (i, val) {
            var node = $(val)
            var word = node.find("word").text()
            wordList.push(word.toLowerCase())
            transList.push(node.find("trans").text())
            phoneticList.push(node.find("phonetic").text())
            originWordList.push(word)
        })
        chrome.storage.local.set({newWords: {wordList, transList, phoneticList}})
        alert("解析成功")
    }
    reader.readAsText(this.files[0])
})
