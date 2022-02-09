"use strict";
const EventEmitter = require("events");
const util = require("../utility");
const logger = require("../logwrapper");
const frontendCommunicator = require("./frontend-communicator");
const { settings } = require("./settings-access");
const twitchApi = require("../twitch-api/api");
const twitchChat = require("../chat/twitch-chat");
const twitchPubSubClient = require("../twitch-api/pubsub/pubsub-client");
const integrationManager = require("../integrations/IntegrationManager");
const accountAccess = require("../common/account-access");
const Promise = require("bluebird");
const { ConnectionState } = require("../../shared/connection-constants");
const profileManager = require("../common/profile-manager.js");

let isOnline = false;
let onlineCheckIntervalId;

/**
 * @type ConnectionManager
 */
let manager;
let topChartDb = profileManager.getJsonDbInProfile('/data/kolTopChart');

function updateOnlineStatus(online) {
    if (online !== isOnline) {
        isOnline = online === true;
        // 更新开播与下播时间到本地
        let data = topChartDb.getData("/") ? topChartDb.getData("/") : null;
        let now = new Date().getTime();
        let dataIsEmpty = data === null || data === undefined || Object.keys(data).length === 0;
        if (!dataIsEmpty && data.last_section && !data.last_section.ended_at
              || data.last_section && data.last_section.ended_at < data.last_section.started_at) { // 上次未在使用kbot时关闭直播间
            topChartDb.push('/last_section/ended_at', now);
        }
        if (isOnline) {
            if (!dataIsEmpty && data.latest && data.latest.started_at && data.latest.ended_at) {
                //如果目前已经开播了，上一次的时间存在，直接把latest的数据赋值给last_section;因为在查询top榜单时，不给last_section.ended_at赋值会存在 last_section.started_at >last_section.ended_at
                topChartDb.push('/last_section/started_at', topChartDb.getData("/latest/started_at"));
                topChartDb.push('/last_section/ended_at', topChartDb.getData("/latest/ended_at"));
                topChartDb.push('/isBroadCasted', true);//开了直播，点击断开连接时，会将值设为false
            } else {
                topChartDb.push('/last_section/started_at', now);
            }
            topChartDb.push('/latest/started_at', now);
        } else { //当前streamer Offline,主播已下播，更新latest数据的ended_at值
            if (!dataIsEmpty && data.latest && data.latest.ended_at) {
                topChartDb.push('/last_section/ended_at', topChartDb.getData("/latest/ended_at"));
            } else {
                topChartDb.push('/last_section/ended_at', now);
            }
            topChartDb.push('/latest/ended_at', now);
        }
        manager.emit("streamerOnlineChange", isOnline);
    }
}

async function checkOnline() {
    const username = accountAccess.getAccounts().streamer.username;
    const isOnline = await twitchApi.channels.getOnlineStatus(username);
    updateOnlineStatus(isOnline);
}

const serviceConnectionStates = {};

function emitServiceConnectionUpdateEvents(serviceId, connectionState, manual = true) {

    serviceConnectionStates[serviceId] = connectionState;

    const eventData = {
        serviceId: serviceId,
        connectionState: connectionState,
        manual: manual
    };
    manager.emit("service-connection-update", eventData);
    frontendCommunicator.send("service-connection-update", eventData);

    if (serviceId === "chat" && connectionState === ConnectionState.Connected) {
        const eventManager = require("../events/EventManager");
        eventManager.triggerEvent("twitcherbot", "chat-connected");
    }
}

// Chat listeners
let manualDisconnected = false;
let connected = false;
let delayFeedbackPopped = false;
let delayFeedbackPop = util.kolDebounce(() => {
    let feedbackInfo = profileManager.getJsonDbInProfile("/feedbackInfo").getData("/");
    if (!connected) {
        logger.info('user is disconnect, continue...');
    } else if (!("isParticipate" in feedbackInfo) || !feedbackInfo.isParticipate) {
        delayFeedbackPopped = true;
        frontendCommunicator.send("show-feedback");
    }
}, 1000 * 60 * 5); // 连接持续5min后弹出一次反馈

twitchChat.on("connected", () => {
    connected = true;
    manualDisconnected = false;
    emitServiceConnectionUpdateEvents("chat", ConnectionState.Connected);
    if (!delayFeedbackPopped) { // 一次应用内只弹一次
        delayFeedbackPop();
    }
});
twitchChat.on("disconnected", (data) => {
    connected = false;
    manualDisconnected = data.manual;
    emitServiceConnectionUpdateEvents("chat", ConnectionState.Disconnected, data.manual);
});
twitchChat.on("connecting", () => emitServiceConnectionUpdateEvents("chat", ConnectionState.Connecting));
twitchChat.on("reconnecting", () => emitServiceConnectionUpdateEvents("chat", ConnectionState.Reconnecting));
let isReconnectRunning = false;
twitchChat.on("need-reconnect", () => {
    let needAutoConnected = () => {
        let isValidUser = accountAccess.getAccounts().streamer.loggedIn && !accountAccess.streamerTokenIssue();
        return isValidUser && !connected && !manualDisconnected;
    };

    let allFailSleepMs = 30000;
    let retryConnectDelayMs = 5000;
    // 3次重试
    let retryConnect = () => {
        if (isReconnectRunning) {
            return;
        }
        isReconnectRunning = true;
        if (!needAutoConnected()) {
            isReconnectRunning = false;
            return;
        }
        Promise.delay(1).then(() => {
            frontendCommunicator.send("need-reconnect");
        }).delay(retryConnectDelayMs).then(() => {
            if (!needAutoConnected()) {
                return Promise.reject({ notRealPromiseException: true });
            }
            frontendCommunicator.send("need-reconnect");
        }).delay(retryConnectDelayMs).then(() => {
            if (!needAutoConnected()) {
                return Promise.reject({ notRealPromiseException: true });
            }
            frontendCommunicator.send("need-reconnect");
        }).delay(retryConnectDelayMs).then(() => {
            if (!needAutoConnected()) {
                return Promise.reject({ notRealPromiseException: true });
            }
            util.kolDebounce(() => {
                logger.info('delay retry start');
                isReconnectRunning = false;
                retryConnect();
            }, allFailSleepMs)();
        }).catch(e => {
            isReconnectRunning = false;
            if (e.notRealPromiseException) {
                logger.info('no need reconnect or reconnect success.');
            } else {
                logger.error('reconnect error', e);
            }
        });
    };

    retryConnect();
});

// Integrations listener
integrationManager.on("integration-connected", (id) => emitServiceConnectionUpdateEvents(`integration.${id}`, ConnectionState.Connected));
integrationManager.on("integration-disconnected", (id) => emitServiceConnectionUpdateEvents(`integration.${id}`, ConnectionState.Disconnected));

let connectionUpdateInProgress = false;

let currentlyWaitingService = null;


/**@extends NodeJS.EventEmitter */
class ConnectionManager extends EventEmitter {
    constructor() {
        super();
    }

    startOnlineCheckInterval() {
        if (onlineCheckIntervalId != null) {
            clearInterval(onlineCheckIntervalId);
        }
        checkOnline();
        onlineCheckIntervalId = setInterval(checkOnline, 30000);
    }

    setOnlineStatus(online) {
        updateOnlineStatus(online);
    }

    streamerIsOnline() {
        return isOnline;
    }

    chatIsConnected() {
        return twitchChat.chatIsConnected();
    }

    serviceIsConnected(serviceId) {
        return serviceConnectionStates[serviceId] === ConnectionState.Connected;
    }

    updateChatConnection(shouldConnect) {
        if (shouldConnect) {
            twitchChat.connect();
            twitchPubSubClient.createClient();
        } else {
            twitchChat.disconnect();
            twitchPubSubClient.disconnectPubSub();
        }
        return true;
    }

    updateIntegrationConnection(integrationId, shouldConnect) {
        if (!integrationManager.integrationIsConnectable(integrationId)) {
            return false;
        }

        if (shouldConnect) {
            integrationManager.connectIntegration(integrationId);
        } else {
            integrationManager.disconnectIntegration(integrationId);
        }
        return true;
    }

    updateServiceConnection(serviceId, shouldConnect) {
        switch (serviceId) {
        case "chat":
            return this.updateChatConnection(shouldConnect);
        default:
            if (serviceId.startsWith("integration.")) {
                const integrationId = serviceId.replace("integration.", "");
                return this.updateIntegrationConnection(integrationId, shouldConnect);
            }
        }
        return false;
    }

    async updateConnectionForServices(services) {

        if (connectionUpdateInProgress) return;

        frontendCommunicator.send("toggle-connections-started");

        connectionUpdateInProgress = true;

        const accountAccess = require("./account-access");
        if (!accountAccess.getAccounts().streamer.loggedIn) {
            renderWindow.webContents.send("error", "You must sign into your Streamer Twitch account before connecting.");
        } else if (accountAccess.streamerTokenIssue()) {
            const botTokenIssue = accountAccess.getAccounts().bot.loggedIn && accountAccess.botTokenIssue();

            const message = `There is an issue with the Streamer ${botTokenIssue ? ' and Bot' : ""} Twitch account${botTokenIssue ? 's' : ""}. Please re-sign into the account${botTokenIssue ? 's' : ""} and try again.`;
            renderWindow.webContents.send("error", message);
        } else {
            const waitForServiceConnectDisconnect = (serviceId, action = true) => {
                const shouldToggle = action === "toggle";

                const shouldConnect = shouldToggle ? !this.serviceIsConnected(serviceId) : action;

                if (shouldConnect === this.serviceIsConnected(serviceId)) {
                    return Promise.resolve();
                }

                const promise = new Promise(resolve => {
                    currentlyWaitingService = {
                        serviceId: serviceId,
                        callback: () => resolve()
                    };
                });

                const willUpdate = this.updateServiceConnection(serviceId, shouldConnect);
                if (!willUpdate && currentlyWaitingService) {
                    currentlyWaitingService.callback();
                    currentlyWaitingService = null;
                }
                return promise;
            };

            try {
                for (const service of services) {
                    await util.wait(175);
                    await waitForServiceConnectDisconnect(service.id, service.action);
                }
            } catch (error) {
                logger.error("error connecting services", error);
            }
        }

        connectionUpdateInProgress = false;

        currentlyWaitingService = null;

        frontendCommunicator.send("connect-services-complete");
    }

    disconnectSidebarControlledServices() {
        logger.debug('disconnected success');
        const serviceIds = settings.getSidebarControlledServices();
        for (const id of serviceIds) {
            this.updateServiceConnection(id, false);
        }
    }
}
manager = new ConnectionManager();

manager.on("service-connection-update", (data) => {
    if (currentlyWaitingService == null) return;

    let { serviceId, connectionState } = data;

    if (connectionState !== ConnectionState.Connected && connectionState !== ConnectionState.Disconnected) return;

    if (currentlyWaitingService.serviceId === serviceId) {
        currentlyWaitingService.callback();
        currentlyWaitingService = null;
    }
});

frontendCommunicator.on("connect-sidebar-controlled-services", async () => {
    const serviceIds = settings.getSidebarControlledServices();

    manager.updateConnectionForServices(serviceIds.map(id => ({
        id,
        action: true
    })));
});

frontendCommunicator.on("disconnect-sidebar-controlled-services", () => {
    manager.disconnectSidebarControlledServices();
});

frontendCommunicator.on("connect-service", (serviceId) => {
    manager.updateServiceConnection(serviceId, true);
});

frontendCommunicator.on("disconnect-service", (serviceId) => {
    manager.updateServiceConnection(serviceId, false);
});

module.exports = manager;
