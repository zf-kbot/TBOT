"use strict";

const { app } = require("electron");

exports.windowsAllClosed = async () => {

    const { settings } = require("../../../common/settings-access");
    const { startBackup } = require("../../../backupManager");

    // Unregister all shortcuts.
    const hotkeyManager = require("../../../hotkeys/hotkey-manager");
    hotkeyManager.unregisterAllHotkeys();

    // Stop the chat moderation service
    const chatModerationManager = require("../../../chat/moderation/chat-moderation-manager");
    chatModerationManager.stopService();

    // Persist custom variables
    if (settings.getPersistCustomVariables()) {
        const customVariableManager = require("../../../common/custom-variable-manager");
        customVariableManager.persistVariablesToFile();
    }

    // Set all users to offline
    const userDatabase = require("../../../database/userDatabase");
    await userDatabase.setAllUsersOffline();
    await userDatabase.setAllUsersOldViewer();

    // Remove eventsub subscriptions
    const eventsubClient = require('../../../twitch-api/eventsub/eventsub-client');
    await eventsubClient.deleteListeners();
    //关闭客户端时，检测是否需要发送用户直播积分发放数据
    const gaPointsHelper = require("../../../../backend/common/ga-points-helpers");
    gaPointsHelper.gaSendStreamerGiveAwayPoints();
    const { appQuit } = require("../../../common/ga-manager");
    appQuit.on("app-quit", () => {
        if (settings.backupOnExit()) {
            // Make a backup
            startBackup(false, app.quit);
        } else {
            app.quit();
        }
    });
    //无论ga是否发送成功，3秒后退出程序
    setTimeout(() => {
        if (settings.backupOnExit()) {
            // Make a backup
            startBackup(false, app.quit);
        } else {
            app.quit();
        }
    }, 3000);
};