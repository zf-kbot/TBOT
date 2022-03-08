"use strict";

const { ipcMain } = require("electron");
const logger = require("../logwrapper");
const EventEmitter = require("events");
const util = require("../utility");
const eventsRouter = require("./events-router");
const eventsAccess = require("./events-access");
const frontendCommuncator = require("../common/frontend-communicator");
const profileManager = require("../common/profile-manager");

function getChatNotificationsFile() {
    return profileManager.getJsonDbInProfile("/interactive-tool/chat-notifications");
}

function getDataFromFile(path) {
    try {
        return getChatNotificationsFile().getData(path);
    } catch (err) {
        return {};
    }
}
function getLevelUpNotificationsFile() {
    return profileManager.getJsonDbInProfile("/loyalty-community/loyalsetting");
}

function getLevelUpDataFromFile(path) {
    try {
        return getLevelUpNotificationsFile().getData(path);
    } catch (err) {
        return {};
    }
}
/**@extends NodeJS.EventEmitter */
class EventManager extends EventEmitter {
    constructor() {
        super();

        this._registeredEventSources = [];
        // 注册activity feed分类筛选项
        this._registeredEventFilters = [];
    }

    registerEventSource(eventSource) {
        // TODO: validate eventSource

        let idConflict = this._registeredEventSources.some(
            es => es.id === eventSource.id
        );

        if (idConflict) {
            return;
        }

        //make sure all events reference this eventsource id
        if (eventSource.events != null) {
            for (let event of eventSource.events) {
                event.sourceId = eventSource.id;
            }
        }

        this._registeredEventSources.push(eventSource);

        logger.debug(`Registered Event Source ${eventSource.id}`);

        this.emit("eventSourceRegistered", eventSource);
    }

    registerEventFilters(filters) {

        this._registeredEventFilters.push(filters);

        logger.debug(`Registered activity Event filters ${filters.id}`);

        this.emit("eventFiltersRegistered", filters);
    }

    getEventSourceById(sourceId) {
        return this._registeredEventSources.find(es => es.id === sourceId);
    }

    getEventById(sourceId, eventId) {
        let source = this._registeredEventSources.find(es => es.id === sourceId);
        let event = source.events.find(e => e.id === eventId);
        return event;
    }

    getAllEventSources() {
        return this._registeredEventSources;
    }

    getAllEventFilters() {
        return this._registeredEventFilters;
    }

    getAllEvents() {
        let eventArrays = this._registeredEventSources
            .map(es => es.events);
        let events = util.flattenArray(eventArrays);
        return events;
    }

    triggerEvent(sourceId, eventId, meta, isManual = false, isRetrigger = false) {
        if (eventId === "announcement") {
            let kolDataLength = 0;
            let dataMsg = "";
            dataMsg = getDataFromFile("/annoucement");
            if (dataMsg.isActive) {
                const twitchChat = require("../chat/twitch-chat");
                if (dataMsg) {
                    kolDataLength = dataMsg.responseMsgs.length;
                    dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                }
                //替换dataMsg.data中的参数为具体信息
                dataMsg = dataMsg.data.replace(/\{streamername\}/g, meta.username);
                dataMsg = dataMsg.replace(/\{game\}/g, meta.gamename);
                dataMsg = dataMsg.replace(/\{title\}/g, meta.title);
                twitchChat.sendChatMessage(dataMsg);
            }
        }
        //用户升级通知
        if (eventId === "level-up") {
            let dataLoyalSettingMsg = getLevelUpDataFromFile("/");
            if (dataLoyalSettingMsg.levelUpNotification) {
                const twitchChat = require("../chat/twitch-chat");
                //替换dataLoyalSettingMsg.levelUpNotificationMessage中的参数为具体信息
                let levelUpNotificationMsg = "";
                levelUpNotificationMsg = dataLoyalSettingMsg.levelUpNotificationMessage.replace(/\{username\}/g, meta.userName);
                levelUpNotificationMsg = levelUpNotificationMsg.replace(/\{level_num\}/g, meta.userLevel);
                twitchChat.sendChatMessage(levelUpNotificationMsg);
            }
        }
        let source = this.getEventSourceById(sourceId);
        let event = this.getEventById(sourceId, eventId);
        if (event == null) return;

        if (isManual) {
            meta = event.manualMetadata || {};
        }
        if (meta == null) {
            meta = {};
        }

        if (meta.username == null) {
            const accountAccess = require("../common/account-access");
            meta.username = accountAccess.getAccounts().streamer.username;
        }

        eventsRouter.onEventTriggered(event, source, meta, isManual, isRetrigger);

        if (!isManual && !isRetrigger) {
            if (!eventsRouter.cacheActivityFeedEvent(source, event, meta)) {
                //get chat-notifications.json file and random choose a message to reply then replace the arguement
                if (event.id === "follow") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/followers");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                if (event.id === "sub") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/subscriber");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                if (event.id === "subs-gifted") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/giftSubscription");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username);
                        dataMsg = dataMsg.replace(/\{amount\}/g, meta.giftDuration);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                //announcement
                if (event.id === "announcement") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/annoucement");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{streamername\}/g, meta.username);
                        dataMsg = dataMsg.replace(/\{game\}/g, meta.game);
                        dataMsg = dataMsg.replace(/\{title\}/g, meta.title);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                if (event.id === "cheer") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/cheer");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username + " ");
                        dataMsg = dataMsg.replace(/\{amount\}/g, meta.bits);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                if (event.id === "host") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/host");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username);
                        dataMsg = dataMsg.replace(/\{amount\}/g, meta.viewerCount);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                if (event.id === "raid") {
                    let kolDataLength = 0;
                    let dataMsg = "";
                    dataMsg = getDataFromFile("/raid");
                    if (dataMsg.isActive) {
                        const twitchChat = require("../chat/twitch-chat");
                        if (dataMsg) {
                            kolDataLength = dataMsg.responseMsgs.length;
                            dataMsg = dataMsg.responseMsgs[Math.floor(Math.random() * kolDataLength)];
                        }
                        //替换dataMsg.data中的参数为具体信息
                        dataMsg = dataMsg.data.replace(/\{username\}/g, meta.username);
                        dataMsg = dataMsg.replace(/\{amount\}/g, meta.viewerCount);
                        twitchChat.sendChatMessage(dataMsg);
                    }
                }
                this.emit("event-triggered", {
                    event,
                    source,
                    meta,
                    isManual,
                    isRetrigger
                });
            }
        }

    }
}

const manager = new EventManager();

ipcMain.on("getAllEventSources", (event) => {
    logger.info("got 'get all event sources' request");
    event.returnValue = manager.getAllEventSources();
});

ipcMain.on("getAllEvents", (event) => {
    logger.info("got 'get all events' request");
    event.returnValue = manager.getAllEvents();
});

// Manually Activate an Event for Testing
// This will manually trigger an event for testing purposes.
ipcMain.on("triggerManualEvent", function(_, data) {

    let { sourceId, eventId, eventSettingsId } = data;

    let source = manager.getEventSourceById(sourceId);
    let event = manager.getEventById(sourceId, eventId);
    if (event == null) return;

    let meta = event.manualMetadata || {};
    if (meta.username == null) {
        const accountAccess = require("../common/account-access");
        meta.username = accountAccess.getAccounts().streamer.username;
    }

    let eventSettings = eventsAccess.getAllActiveEvents().find(e => e.id === eventSettingsId);
    if (eventSettings == null) return;

    eventsRouter.runEventEffects(eventSettings.effects, event, source, meta, true);
});

frontendCommuncator.on("simulateEvent", ({eventSourceId, eventId}) => {
    manager.triggerEvent(eventSourceId, eventId, null, true);
});

module.exports = manager;
