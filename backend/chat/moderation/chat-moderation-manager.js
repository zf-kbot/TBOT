"use strict";
const logger = require("../../logwrapper");
const profileManager = require("../../common/profile-manager");
const { Worker } = require("worker_threads");
const frontendCommunicator = require("../../common/frontend-communicator");
const rolesManager = require("../../roles/custom-roles-manager");
const permitCommand = require("./url-permit-command");

let getChatModerationSettingsDb = () => profileManager.getJsonDbInProfile("/chat/moderation/chat-moderation-settings");
let getBannedWordsDb = () => profileManager.getJsonDbInProfile("/chat/moderation/banned-words", false);

// default settings
let chatModerationSettings = {
    bannedWordList: {
        enabled: false
    },
    repetitions: {
        enabled: false,
        max: 10,
    },
    emoteLimit: {
        enabled: false,
        max: 10
    },
    excessCaps: {
        enabled: false,
        max: 10,
    },
    symbols: {
        enabled: false,
        max: 10,
    },
    urlModeration: {
        enabled: false,
        viewTime: {
            enabled: false,
            viewTimeInHours: 0
        },
        outputMessage: "你好"
    },
    exemptRoles: []
};

let bannedWords = {
    words: []
};
//记录进入Moderation-manager.js的chatMessage
let currentModerationMessage;
function getBannedWordsList() {
    if (!bannedWords || !bannedWords.words) return [];
    return bannedWords.words.map(w => w.text);
}

/**
 * @type Worker
 */
let moderationService = null;

function startModerationService() {
    if (moderationService != null) return;

    const chat = require("../twitch-chat");

    let servicePath = require("path").resolve(__dirname, "./moderation-service.js");

    if (servicePath.includes("app.asar")) {
        servicePath = servicePath.replace('app.asar', 'app.asar.unpacked');
    }

    moderationService = new Worker(servicePath);

    moderationService.on("message", event => {
        if (event == null) return;
        switch (event.type) {
        case "deleteMessage": {
            if (event.messageId) {
                logger.debug(`Chat message with id '${event.messageId}' contains a banned word. Deleting...`);
                //触发默认黑名单词汇，写入punishment history中
                let punishmentHistoryItem = {
                    _id: currentModerationMessage.id,
                    phrase: "default blacklist words",
                    punishment: "delete",
                    message: currentModerationMessage.rawText,
                    userId: currentModerationMessage.userId,
                    username: currentModerationMessage.username,
                    profilePicUrl: currentModerationMessage.profilePicUrl,
                    createdAt: new Date().getTime()
                };
                const punishmenthistorydb = require('../../database/punishmentHistoryDatabase');
                punishmenthistorydb.createPunishmentHistory(punishmentHistoryItem);
                chat.deleteMessage(event.messageId);
            }
            break;
        }
        }
    });

    moderationService.on("error", code => {
        logger.warn(`Moderation worker failed with code: ${code}.`);
        moderationService.unref();
        moderationService = null;
        //startModerationService();
    });

    moderationService.on("exit", code => {
        logger.debug(`Moderation service stopped with code: ${code}.`);
    });

    moderationService.postMessage(
        {
            type: "bannedWordsUpdate",
            words: getBannedWordsList()
        }
    );

    logger.info("Finished setting up chat moderation worker.");
}

function stopService() {
    if (moderationService != null) {
        moderationService.terminate();
        moderationService.unref();
        moderationService = null;
    }
}

function compare_max(array_say) {
    //单词数字打印
    let array = array_say;
    let map = {};
    let max = 0;
    if (array) {
        for (let i = 0; i < array.length; i++) {
            let strWord = array[i];
            if (!map[strWord]) {
                map[strWord] = 1;
            }
            else {
                map[strWord]++;
            }
        }
        for (let word in map) {
            if (map[word] > max) {
                max = map[word];
            }
        }
    }
    return max;
}

const countEmojis = (str) => {
    const re = /\p{Extended_Pictographic}/ug; //eslint-disable-line
    return ((str || '').match(re) || []).length;
};

const countRepetitions = (str) => {
    //只保留字母数字和汉字，其余符号全部设置为空格，并将多余空格转为1个空格，并去掉开头和结尾的空格
    let temp_word_num_chichar = str.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, " ");
    temp_word_num_chichar = temp_word_num_chichar.replace(/ {1,}/g, " ");
    temp_word_num_chichar = temp_word_num_chichar.replace(/^ | $/g, "");

    //获得单词和数字(屏蔽掉所有汉字)
    let word_num = temp_word_num_chichar.replace(/[\u4e00-\u9fa5]/g, "");
    word_num = word_num.replace(/ {1,}/g, " ");
    word_num = word_num.replace(/^ | $/g, "");
    let split_word_num = word_num.split(" ");

    //获取汉字（屏蔽掉单词和数字和空格）
    let chinese_character = temp_word_num_chichar.replace(/[A-Za-z0-9 ]/g, "");
    let regex_chinese_character = /[\u4e00-\u9fa5]/g;
    let match_chinese_character = chinese_character.match(regex_chinese_character) + "";
    let split_chinese_character = match_chinese_character.split(",");
    let max_word_num = compare_max(split_word_num);
    let max_chinese_character = compare_max(split_chinese_character)
    return max_word_num > max_chinese_character ? max_word_num : max_chinese_character;
};

const countExcessCaps = (str) => {
    //只保留大写字母，屏蔽其他所有字符
    let up_letter = str.replace(/[^A-Z]/g, "");
    let regex_up_letter = /[A-Z]/g;
    let match_up_letter = up_letter.match(regex_up_letter);
    if (!match_up_letter) {
        return 0;
    } else {
        return match_up_letter.length;
    }
};

const countSymbols = (str) => {
    //只匹配标点符号，用unicode表示,其余全部清掉
    let punctuation = str.replace(/[^\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g, "");
    let regex_punctuation = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g;
    let match_punctuation = punctuation.match(regex_punctuation);
    if (!match_punctuation) {
        return 0;
    } else {
        return match_punctuation.length;
    }
};

/**
 *
 * @param {import("../chat-helpers").TwitchbotChatMessage} chatMessage
 */
async function moderateMessage(chatMessage) {
    if (chatMessage == null) return;

    if (
        !chatModerationSettings.bannedWordList.enabled
        && !chatModerationSettings.emoteLimit.enabled
        && !chatModerationSettings.repetitions.enabled
        && !chatModerationSettings.excessCaps.enabled
        && !chatModerationSettings.symbols.enabled
        && !chatModerationSettings.urlModeration.enabled
    ) return;

    let moderateMessage = false;
    //判断是否在豁免角色范围内
    const userExempt = rolesManager.userIsInRole(chatMessage.username, chatMessage.roles,
        chatModerationSettings.exemptRoles);

    if (!userExempt) {
        moderateMessage = true;
    }
    const chat = require("../twitch-chat");

    //这里区分消息过滤和黑名单词汇，故从if(moderateMessage)中拿出来，如果要统一设置豁免的角色，直接拿下去
    if (chatModerationSettings.emoteLimit.enabled && !!chatModerationSettings.emoteLimit.max) {
        const emoteCount = chatMessage.parts.filter(p => p.type === "emote").length;
        const emojiCount = chatMessage.parts
            .filter(p => p.type === "text")
            .reduce((acc, part) => acc + countEmojis(part.text), 0);
        if ((emoteCount + emojiCount) > chatModerationSettings.emoteLimit.max) {
            chat.deleteMessage(chatMessage.id);
            return;
        }
    }
    //重复单词数字汉字
    if (chatModerationSettings.repetitions.enabled && !!chatModerationSettings.repetitions.max) {
        const repetitionsCount = chatMessage.parts
            .filter(p => p.type === "text")
            .reduce((acc, part) => acc + countRepetitions(part.text), 0);
        if (repetitionsCount > chatModerationSettings.repetitions.max) {
            chat.deleteMessage(chatMessage.id);
            return;
        }
    }
    //重复大写
    if (chatModerationSettings.excessCaps.enabled && !!chatModerationSettings.excessCaps.max) {
        const excessCapsCount = chatMessage.parts
            .filter(p => p.type === "text")
            .reduce((acc, part) => acc + countExcessCaps(part.text), 0);
        if (excessCapsCount > chatModerationSettings.excessCaps.max) {
            chat.deleteMessage(chatMessage.id);
            return;
        }
    }
    //重复符号
    if (chatModerationSettings.symbols.enabled && !!chatModerationSettings.symbols.max) {
        const symbolsCount = chatMessage.parts
            .filter(p => p.type === "text")
            .reduce((acc, part) => acc + countSymbols(part.text), 0);
        if (symbolsCount > chatModerationSettings.symbols.max) {
            chat.deleteMessage(chatMessage.id);
            // chat.timeoutUser(chatMessage.username,20,"");
            return;
        }
    }

    if (moderateMessage) {
        //这里是超链接的设定。该功能未放开UI界面。
        if (chatModerationSettings.urlModeration.enabled) {
            if (permitCommand.hasTemporaryPermission(chatMessage.username)) return;

            const message = chatMessage.rawText;
            const regex = new RegExp(/[\w][.][a-zA-Z]/, "gi");

            if (!regex.test(message)) return;

            logger.debug("Url moderation: Found url in message...");

            const settings = chatModerationSettings.urlModeration;
            let outputMessage = settings.outputMessage || "";

            if (settings.viewTime && settings.viewTime.enabled) {
                const viewerDB = require('../../database/userDatabase');
                const viewer = await viewerDB.getUserByUsername(chatMessage.username);

                const viewerViewTime = viewer.minutesInChannel / 60;
                const minimumViewTime = settings.viewTime.viewTimeInHours;

                if (viewerViewTime >= minimumViewTime) return;

                outputMessage = outputMessage.replace("{viewTime}", minimumViewTime.toString());

                logger.debug("Url moderation: Not enough view time.");
            } else {
                logger.debug("Url moderation: User does not have exempt role.");
            }

            chat.deleteMessage(chatMessage.id);

            if (outputMessage) {
                outputMessage = outputMessage.replace("{userName}", chatMessage.username);
                chat.sendChatMessage(outputMessage);
            }
        }
        //可能需要被删除的消息,
        currentModerationMessage = chatMessage;
        const message = chatMessage.rawText;
        const messageId = chatMessage.id;
        moderationService.postMessage(
            {
                type: "moderateMessage",
                message: message,
                messageId: messageId,
                scanForBannedWords: chatModerationSettings.bannedWordList.enabled,
                maxEmotes: null
            }
        );
    }
}

frontendCommunicator.on("chatMessageSettingsUpdate", settings => {
    chatModerationSettings = settings;
    try {
        getChatModerationSettingsDb().push("/", settings);
    } catch (error) {
        if (error.name === 'DatabaseError') {
            logger.error("Error saving chat moderation settings", error);
        }
    }
});

function saveBannedWordList() {
    try {
        getBannedWordsDb().push("/", bannedWords);
    } catch (error) {
        if (error.name === 'DatabaseError') {
            logger.error("Error saving banned words data", error);
        }
    }
    if (moderationService != null) {
        moderationService.postMessage(
            {
                type: "bannedWordsUpdate",
                words: getBannedWordsList()
            }
        );
    }
}

frontendCommunicator.on("addBannedWords", words => {
    bannedWords.words = bannedWords.words.concat(words);
    saveBannedWordList();
});

frontendCommunicator.on("removeBannedWord", wordText => {
    bannedWords.words = bannedWords.words.filter(w => w.text.toLowerCase() !== wordText);
    saveBannedWordList();
});

frontendCommunicator.on("removeAllBannedWords", () => {
    bannedWords.words = [];
    saveBannedWordList();
});

frontendCommunicator.on("getChatModerationData", () => {
    return {
        settings: chatModerationSettings,
        bannedWords: bannedWords.words
    };
});

function load() {
    try {
        let settings = getChatModerationSettingsDb().getData("/");
        if (settings && Object.keys(settings).length > 0) {
            //这里在when ready检测初始化时非常重要，需要判断值的问题，否则在moderateMessage()方法中会提示undefined,直接报error
            if (settings.exemptRoles == null) {
                settings.exemptRoles = [];
            }
            if (settings.emoteLimit == null) {
                settings.emoteLimit = { enabled: false, max: 10 };
            }
            if (settings.bannedWordList == null) {
                settings.bannedWordList = { enabled: false};
            }
            if (settings.repetitions == null) {
                settings.repetitions = { enabled: false, max: 10};
            }
            if (settings.excessCaps == null) {
                settings.excessCaps = { enabled: false, max: 10};
            }
            if (settings.symbols == null) {
                settings.symbols = { enabled: false, max: 10};
            }
            if (settings.urlModeration == null) {
                settings.urlModeration = {
                    enabled: false,
                    viewTime: {
                        enabled: false,
                        viewTimeInHours: 0
                    },
                    outputMessage: ""
                };
            }

            if (settings.urlModeration.enabled) {
                permitCommand.registerPermitCommand();
            }
            chatModerationSettings = settings;
        }

        let words = getBannedWordsDb().getData("/");
        if (words && Object.keys(words).length > 0) {
            bannedWords = words;
        }
    } catch (error) {
        if (error.name === 'DatabaseError') {
            logger.error("Error loading chat moderation data", error);
        }
    }
    logger.info("Attempting to setup chat moderation worker...");
    startModerationService();
}
exports.load = load;
exports.stopService = stopService;
exports.moderateMessage = moderateMessage;