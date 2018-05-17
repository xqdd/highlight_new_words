chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type = "tts") {
        if (!!request.word && typeof request.word === "string") {
            chrome.tts.speak(request.word, {lang: "en", gender: "male"})
        }
    }
    // sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
})


// chrome.tts.getVoices(function (voices) {
//     console.log(voices)
// })