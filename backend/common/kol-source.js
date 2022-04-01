"use strict";
const jsonDataHelper = require("./json-data-helpers");
function loadDefaultBlacklistedWords() {
    //判断banned-words是否为空，为空就从写入数据
    let defaultBlacklistedWords = jsonDataHelper.getObjectDataMsgs('/chat/moderation/banned-words', '/');
    if (!defaultBlacklistedWords.hasOwnProperty("words")) {
        const defaultBlacklistedWordsSource = require("../app-management/electron/startup-resource/default-blacklisted-words.json");
        jsonDataHelper.saveDataMsg('/chat/moderation/banned-words', '/', defaultBlacklistedWordsSource);
        //设置默认黑名单词汇的状态为关闭
        jsonDataHelper.saveDataMsg('/chat/moderation/chat-moderation-settings', '/bannedWordList/enabled', false);
    }
}

exports.loadDefaultBlacklistedWords = loadDefaultBlacklistedWords;
