//生词本
var newWords;
//当前要显示的节点
var currNode
//鼠标节点（实时）
var mouseNode
//已经显示了的节点
var showedNode
//是否允许隐藏气泡
var isAllowHideBubble = true
//气泡显示/隐藏延迟时间(ms)
var delayed = 100
//生词信息列表
var currWord
var currWordData

$(function () {
    init()
})


/**
 * 初始化
 */
function init() {
    //从localstorege获取生词列表，高亮所有匹配的节点
    chrome.storage.local.get(["toggle"], function (r) {
        if (r.toggle) {
            chrome.storage.local.get(["newWords"], function (result) {
                // var before = new Date().getTime()
                newWords = result.newWords;
                highlight(textNodesUnder(document.body))
                //console.log("解析总耗时：" + (new Date().getTime() - before) + " ms")

                //在插入节点时修改
                document.addEventListener("DOMNodeInserted", onNodeInserted, false);
                chrome.runtime.sendMessage({type: "setStyle"})
            })

        }
    })

    //创建鼠标悬浮气泡
    createBubble();

    //监听xml导入成功消息
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.type == "importSuccess") {
            alert("导入生词本成功")
        }
    })


}

/**
 * 创建鼠标悬浮气泡
 */
function createBubble() {
    //创建添加到body中
    var div = $("<div>").attr("class", "xqdd_bubble")
    var deleteButton = $("<span>")
        .attr("class", "xqdd_bubble_delete")
        .text("✖")
        .click(() => {
            if (window.confirm("确认删除单词？（若已登录云端，云端单词会同时删除），删除后刷新页面生效")) {
                chrome.runtime.sendMessage({type: "delete", wordData: currWordData}, function (msg) {
                    if (msg) {
                        // alert(msg)
                    }
                })
            }
        })
    var word = $("<span>").attr("class", "xqdd_bubble_word")
    var trans = $("<span>").attr("class", "xqdd_bubble_trans")
    div.append(deleteButton).append(word).append(trans)
    $(document.body).append(div)

    //添加鼠标进入离开事件
    div.on("mouseleave", function (e) {
        hideBubbleDelayed()
    })
    div.on("mouseenter", function (e) {
        isAllowHideBubble = false
    })

    //监听鼠标位置
    document.addEventListener("mousemove", handleMouseMove, false)
    // document.addEventListener("mousedown", hideBubble(), false)

    //监听窗口滚动
    window.addEventListener("scroll", function () {
        isAllowHideBubble = true
        hideBubble()
    })
}

/**
 * 显示气泡
 */
function showBubble() {
    if (!!currNode) {
        var bubble = $(".xqdd_bubble")
        if (showedNode != currNode || bubble.css("display") != "flex") {
            var nodeRect = currNode.getBoundingClientRect();
            var word = $(currNode).text()
            var wordInfo = newWords.wordInfos[word.toLowerCase()]
            $(".xqdd_bubble_word").text(word + "  " + wordInfo["phonetic"])
            $(".xqdd_bubble_trans").text(wordInfo["trans"])
            currWord = wordInfo["word"]
            currWordData = wordInfo
            bubble
                .css("top", nodeRect.bottom + 'px')
                .css("left", Math.max(5, Math.floor((nodeRect.left + nodeRect.right) / 2) - 100) + 'px')
                .css("display", 'flex')
            chrome.runtime.sendMessage({type: "tts", word})
            showedNode = currNode
        }
    }
}

/**
 * 处理鼠标移动
 * @param e
 */
function handleMouseMove(e) {
    //获取鼠标所在节点
    mouseNode = document.elementFromPoint(e.clientX, e.clientY);
    if (!mouseNode) {
        hideBubbleDelayed()
        return
    }
    var classAttr = "";
    try {
        classAttr = mouseNode.getAttribute("class");
    } catch (exc) {
        hideBubbleDelayed()
        return
    }
    if (!classAttr || !classAttr.startsWith("xqdd_")) {
        hideBubbleDelayed()
        return
    }
    isAllowHideBubble = false
    if (!classAttr.startsWith("xqdd_highlight_new_word")) {
        return;
    }
    currNode = mouseNode
    //延迟显示（防止鼠标一闪而过的情况）
    setTimeout(function () {
        //是本节点
        if (currNode == mouseNode) {
            showBubble();
        }
        //非本节点
        else if ($(mouseNode).attr("class") && !$(mouseNode).attr("class").startsWith("xqdd_")) {
            isAllowHideBubble = true
        }
    }, delayed)
}

/**
 * 延迟隐藏气泡
 */
function hideBubbleDelayed() {
    isAllowHideBubble = true
    setTimeout(function () {
        hideBubble();
    }, delayed);
}


/**
 * 隐藏气泡
 */
function hideBubble() {
    if (isAllowHideBubble) {
        $(".xqdd_bubble").css("display", "none")
    }
}

/**
 *
 * @param nodes 高亮所有节点
 *
 */
function highlight(nodes) {
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i]
        var text = node.textContent
        if (text.trim() == "") {
            continue
        }
        //新节点的内容
        var newNodeChildrens = highlightNode(text)
        var parent_node = node.parentNode
        //替换新节点
        if (newNodeChildrens.length == 0) {
            continue;
        }
        //处理a标签显示异常
        if (parent_node.tagName.toLowerCase() == "a") {
            parent_node.style.display = "inline-block";
            // $(parent_node).css("display", "inline-block");
        }
        for (var j = 0; j < newNodeChildrens.length; j++) {
            parent_node.insertBefore(newNodeChildrens[j], node);
        }
        parent_node.removeChild(node);

    }


}

/**
 * 高亮单个节点
 * @param text
 */
function highlightNode(texts) {
    // return [$("<span>").css("background", "red").text(texts)[0]]
    //将句子解析成待检测单词列表
    var words = [];
    //使用indexof
    //  var tempTexts = texts
    // while (tempTexts.length > 0) {
    //     tempTexts = tempTexts.trim()
    //     var pos = tempTexts.indexOf(" ")
    //     if (pos < 0) {
    //         words.push(tempTexts)
    //         break
    //     } else {
    //         words.push(tempTexts.slice(0, pos))
    //         tempTexts = tempTexts.slice(pos)
    //     }
    // }

    //使用split
    var tempTexts = texts.split(" ")
    for (i in tempTexts) {
        var tempText = tempTexts[i].trim()
        if (tempText != "") {
            words.push(tempText)
        }
    }

    if (words.length >= 1) {
        //处理后结果
        var newNodeChildrens = []
        //剩下未处理的字符串
        var remainTexts = texts
        //已处理部分字符串
        var checkedText = ""
        for (var i = 0; i < words.length; i++) {
            var word = words[i]
            //当前所处位置
            var pos2 = remainTexts.indexOf(word)
            //匹配单词
            // if (newWords.indexOf(word.toLowerCase()) !== -1) {
            if (newWords && newWords.wordInfos && newWords.wordInfos.hasOwnProperty(word.toLowerCase())) {
                //匹配成功
                //添加已处理部分到节点
                if (checkedText != "") {
                    newNodeChildrens.push(document.createTextNode(checkedText))
                    checkedText = ""
                }
                if (pos2 == 0) {
                    // wordxx类型
                    newNodeChildrens.push(hightlightText(word))
                } else {
                    //xxwordxx类型
                    // var preText = remainTexts.slice(0, pos2)
                    // if (i == 0 && preText.trim() == " ") {
                    //     //处理<xx> <xxx>之间的空格问题
                    //     newNodeChildrens.push($("<span>").text(preText)[0])
                    // } else {
                    newNodeChildrens.push(document.createTextNode(remainTexts.slice(0, pos2)))
                    // }
                    newNodeChildrens.push(hightlightText(word))
                }
            } else {
                //匹配失败，追加到已处理字符串
                checkedText += remainTexts.slice(0, pos2 + word.length)
            }
            //删除已处理的字符(到当前单词的位置)
            remainTexts = remainTexts.slice(pos2 + word.length)
        }
        //处理最末尾
        if (newNodeChildrens.length != 0) {
            if (checkedText != "") {
                newNodeChildrens.push(document.createTextNode(checkedText))
            }
            newNodeChildrens.push(document.createTextNode(remainTexts))
        }
    }
    return newNodeChildrens
}


/**
 * 高亮单个单词
 * @param text
 * @returns {*}
 */
function hightlightText(text) {
    //注意jqury对象转为dom对象使用[0]或者.get(0)
    return $("<xqdd_highlight_new_word>").attr("class", "xqdd_highlight_new_word").text(text)[0];
}


/**
 * 过滤所有文本节点
 * @param el
 * @returns {Array}
 */
function textNodesUnder(el) {
    var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, mygoodfilter, false);
    while (n = walk.nextNode()) {
        a.push(n);
    }
    return a;
}


/**
 * 节点过滤器
 * @param node
 * @returns {number}
 */
function mygoodfilter(node) {
    var good_tags_list = [
        "PRE",
        "A",
        "P",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "B",
        "SMALL",
        "STRONG",
        "Q",
        "DIV",
        "SPAN",
        "LI",
        "TD",
        "OPTION",
        "I",
        "BUTTON",
        "UL",
        "CODE",
        "EM",
        "TH",
        "CITE",
    ];
    if (good_tags_list.indexOf(node.parentNode.tagName) !== -1) {
        return NodeFilter.FILTER_ACCEPT;
    }
    return NodeFilter.FILTER_SKIP;
}

/**
 * 节点插入时判断高亮
 * @param event
 */
function onNodeInserted(event) {
    var inobj = event.target;
    if (!inobj)
        return;
    var classattr = null;
    if (typeof inobj.getAttribute !== 'function') {
        return;
    }
    try {
        classattr = inobj.getAttribute('class');
    } catch (e) {
        return;
    }
    if (!classattr || !classattr.startsWith("xqdd")) {
        highlight(textNodesUnder(inobj))
    }
}