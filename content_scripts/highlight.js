var newWords;
chrome.storage.local.get("newWords", function (result) {
    //获取所有文本节点
    newWords = result.newWords.wordList;
    highlight(textNodesUnder(document.body))
    //插入节点时修改
    document.addEventListener("DOMNodeInserted", onNodeInserted, false);
})


/**
 *
 * @param nodes 高亮所有节点
 *
 */
function highlight(nodes) {
    var before = new Date().getTime()
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i]
        var text = node.textContent
        if (text == null || !text || text.trim() == "") {
            continue
        }
        //新节点的内容
        var newNodeChildrens = highlightNode(text)
        var parent_node = nodes[i].parentNode
        //替换新节点
        if (newNodeChildrens == null || !newNodeChildrens || newNodeChildrens.length == 0) {
            continue;
        }
        for (var j = 0; j < newNodeChildrens.length; j++) {
            parent_node.insertBefore(newNodeChildrens[j], nodes[i]);
        }
        parent_node.removeChild(nodes[i]);
    }

    console.log("解析耗时：" + (new Date().getTime() - before))
}

/**
 * 高亮单个节点
 * @param text
 */
function highlightNode(texts) {
    //解析待检测单词列表
    var words = [];
    var tempTexts = texts
    while (tempTexts.length > 0) {
        tempTexts = tempTexts.trim()
        var pos = tempTexts.indexOf(" ")
        if (pos < 0) {
            words.push(tempTexts)
            break
        } else {
            words.push(tempTexts.slice(0, pos))
            tempTexts = tempTexts.slice(pos)
        }
    }

    if (words.length >= 1) {
        //处理后结果
        var newNodeChildrens = [];
        //剩下未处理的字符串
        var remainTexts = texts
        for (var i = 0; i < words.length; i++) {
            var word = words[i]
            //当前所处位置
            var pos2 = remainTexts.indexOf(word)
            //匹配单词
            if (newWords.indexOf(word.toLowerCase()) !== -1) {
                //匹配成功
                if (pos2 == 0) {
                    // wordxx类型
                    newNodeChildrens.push(hightlightText(word))
                } else {
                    //xxwordxx类型
                    newNodeChildrens.push(document.createTextNode(remainTexts.slice(0, pos2)))
                    newNodeChildrens.push(hightlightText(word))
                }
            } else {
                //匹配不上，处理前面部分
                newNodeChildrens.push(document.createTextNode(remainTexts.slice(0, pos2 + word.length)))
            }
            //处理末尾
            remainTexts = remainTexts.slice(pos2 + word.length)
        }
        //处理末尾
        newNodeChildrens.push(document.createTextNode(remainTexts))
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