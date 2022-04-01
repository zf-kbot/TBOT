"use strict";
(function() {
    //This handles settings access for frontend

    const fs = require("fs");
    const { ipcRenderer } = require("electron");

    angular
        .module("twitcherbotApp")
        .factory("settingsService", function($rootScope, $route, utilityService, logger, profileManager, dataAccess, backendCommunicator, gaService) {
            let service = {};

            let settingsCache = {};

            backendCommunicator.on("flush-settings-cache", () => {
                settingsCache = {};
            });

            backendCommunicator.on("settings-updated-main", (settingsUpdate) => {
                if (settingsUpdate == null) return;
                let { path, data } = settingsUpdate;
                if (path == null || path === '') return;
                settingsCache[path] = data;
            });

            function getSettingsFile() {
                return profileManager.getJsonDbInProfile("/settings");
            }

            function pushDataToFile(path, data) {
                try {
                    getSettingsFile().push(path, data);
                    settingsCache[path] = data;
                    backendCommunicator.fireEvent("settings-updated-renderer", { path, data });
                } catch (err) {} //eslint-disable-line no-empty
            }

            function getDataFromFile(path, forceCacheUpdate) {
                try {
                    if (settingsCache[path] == null || forceCacheUpdate) {
                        let data = getSettingsFile().getData(path);
                        settingsCache[path] = data;
                    }
                } catch (err) {
                    if (err.name !== "DataError") {
                        logger.warn(err);
                    }
                }
                return settingsCache[path];
            }

            function deleteDataAtPath(path) {
                try {
                    getSettingsFile().delete(path);
                    delete settingsCache[path];
                    backendCommunicator.fireEvent("settings-updated-renderer", { path, data: null });
                } catch (err) {} //eslint-disable-line no-empty
            }

            service.purgeSettingsCache = function() {
                settingsCache = {};
                backendCommunicator.fireEvent("purge-settings-cache");
            };

            service.getGuardAgainstUnfollowUnhost = function() {
                let enabled = getDataFromFile('/settings/moderation/guardAgainstUnfollowUnhost');
                return enabled != null ? enabled : false;
            };

            service.setGuardAgainstUnfollowUnhost = function(enabled) {
                pushDataToFile('/settings/moderation/guardAgainstUnfollowUnhost', enabled === true);
            };

            service.getKnownBoards = function() {
                try {
                    // This feeds the boardService with known boards and their lastUpdated values.
                    let settingsDb = getSettingsFile();
                    let boards = settingsDb.getData("/boards");
                    return boards;
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.deleteKnownBoard = function(boardId) {
                // This will delete a known board if provided a board id.
                try {
                    deleteDataAtPath("/boards/" + boardId);
                } catch (err) {
                    logger.info(err);
                }
            };

            service.getBoardLastUpdatedDatetimeById = function(id) {
                // Preparing for data from settings.json/boards/$boardId/lastUpdated
                let lastUpdatedDatetime = null;
                // Check if data is present for given board
                try {
                    lastUpdatedDatetime = getSettingsFile().getData(
                        `/boards/${id}/lastUpdated`
                    );
                } catch (err) {
                    logger.info(
                        "We encountered an error, most likely there are no boards in file so we need to build the boards and save them first",
                        err
                    );
                }
                return lastUpdatedDatetime;
            };

            service.setBoardLastUpdatedDatetimeById = function(
                boardId,
                boardName,
                boardDate
            ) {
                // Building the board with ID and lastUpdated before pushing to settings
                let settingsBoard = {
                    boardId: boardId,
                    boardName: boardName,
                    lastUpdated: boardDate
                };
                pushDataToFile(`/boards/${boardId}`, settingsBoard);
            };

            service.getLastMixplayProjectId = function() {
                let projectId;
                try {
                    projectId = getSettingsFile().getData("/mixplay/lastProjectId");
                } catch (err) {
                    logger.warn(err);
                }
                return projectId;
            };

            service.setLastMixplayProjectId = function(id) {
                pushDataToFile("/mixplay/lastProjectId", id);
            };

            service.getActiveMixplayProjectId = function() {
                let projectId;
                try {
                    projectId = getSettingsFile().getData("/mixplay/activeProjectId");
                } catch (err) {
                    logger.warn(err);
                }
                return projectId;
            };

            service.setActiveMixplayProjectId = function(id) {
                pushDataToFile("/mixplay/activeProjectId", id);
            };

            service.getCustomScriptsEnabled = function() {
                return getDataFromFile("/settings/runCustomScripts") === true;
            };

            service.setCustomScriptsEnabled = function(enabled) {
                pushDataToFile("/settings/runCustomScripts", enabled === true);
            };

            service.getSidebarExpanded = function() {
                const expanded = getDataFromFile("/settings/sidebarExpanded");
                return expanded != null ? expanded : true;
            };

            service.setSidebarExpanded = function(expanded) {
                pushDataToFile("/settings/sidebarExpanded", expanded === true);
            };

            service.getDefaultToAdvancedCommandMode = function() {
                return getDataFromFile("/settings/defaultToAdvancedCommandMode") === true;
            };

            service.setDefaultToAdvancedCommandMode = function(defaultToAdvanced) {
                pushDataToFile("/settings/defaultToAdvancedCommandMode", defaultToAdvanced === true);
            };

            service.getSeenAdvancedCommandModePopup = function() {
                return getDataFromFile("/settings/seenAdvancedCommandModePopup") === true;
            };

            service.setSeenAdvancedCommandModePopup = function(seen) {
                pushDataToFile("/settings/seenAdvancedCommandModePopup", seen === true);
            };

            service.getPersistCustomVariables = function() {
                return getDataFromFile("/settings/persistCustomVariables") === true;
            };

            service.setPersistCustomVariables = function(enabled) {
                pushDataToFile("/settings/persistCustomVariables", enabled === true);
            };

            service.getAllowQuoteCSVDownloads = function() {
                return getDataFromFile("/settings/allowQuoteCSVDownloads") !== false;
            };

            service.setAllowQuoteCSVDownloads = function(enabled) {
                pushDataToFile("/settings/allowQuoteCSVDownloads", enabled === true);
            };

            service.legacySortTagsImported = function() {
                return getDataFromFile("/settings/legacySortTagsImported") === true;
            };

            service.setLegacySortTagsImported = function(enabled) {
                pushDataToFile("/settings/legacySortTagsImported", enabled === true);
            };

            service.getViewerListPageSize = function() {
                let viewerListPageSize = getDataFromFile("/settings/viewerListDatabase/pageSize");
                return viewerListPageSize != null ? viewerListPageSize : 10;
            };

            service.setViewerListPageSize = function(viewerListPageSize = 10) {
                pushDataToFile("/settings/viewerListDatabase/pageSize", viewerListPageSize);
            };

            service.isBetaTester = function() {
                let betaTester = getDataFromFile("/settings/beta");
                return betaTester != null ? betaTester : "No";
            };

            service.setBetaTester = function(isTester) {
                pushDataToFile("/settings/beta", isTester);
            };

            service.getEmulator = function() {
                let emulator = getDataFromFile("/settings/emulation");
                return emulator != null ? emulator : "Robotjs";
            };

            service.setEmulator = function(emulator) {
                pushDataToFile("/settings/emulation", emulator);
            };

            service.getViewerDB = function() {
                let viewerDB = getDataFromFile("/settings/viewerDB");

                // If viewerDB setting is not set, default to true to avoid future "cant find datapath" errors.
                if (viewerDB == null) {
                    logger.debug('Viewer DB setting not found. Defaulting to true.');
                    service.setViewerDB(true);
                    viewerDB = getDataFromFile("/settings/viewerDB");
                }
                return viewerDB != null ? viewerDB : true;
            };

            service.setViewerDB = function(status) {
                pushDataToFile("/settings/viewerDB", status);

                if (status === true) {
                    ipcRenderer.send("viewerDbConnect");
                } else {
                    ipcRenderer.send("viewerDbDisconnect");
                }
            };

            // Used for settings menu.
            service.getChatFeed = function() {
                let chatFeed = getDataFromFile("/settings/chatFeed");
                if (chatFeed === true) {
                    return "On";
                }
                return "Off";
            };

            // Used for the app itself.
            service.getRealChatFeed = function() {
                return true;
            };

            service.chatFeedEnabled = function() {
                return true;
            };

            service.setChatFeed = function() {};

            // Used for settings menu.
            service.getChatViewCount = function() {
                let chatViewCount = getDataFromFile("/settings/chatViewCount");
                if (chatViewCount === true) {
                    return "On";
                }
                return "Off";
            };

            service.setChatViewCount = function(chatViewCount) {
                pushDataToFile("/settings/chatViewCount", chatViewCount === true);
            };

            service.getViewerCount = function() {
                return getDataFromFile("/settings/chatViewCount");
            };

            service.getShowChatViewerList = function() {
                const value = getDataFromFile("/settings/chatUsersList");
                return value == null ? true : value;
            };

            service.setShowChatViewerList = function(chatViewerList) {
                pushDataToFile("/settings/chatUsersList", chatViewerList === true);
            };

            service.showActivityFeed = function() {
                const show = getDataFromFile("/settings/activityFeed");
                return show == null ? true : show;
            };

            service.setShowActivityFeed = function(showActivityFeed) {
                pushDataToFile("/settings/activityFeed", showActivityFeed === true);
            };

            service.showHistory = function() {
                const show = getDataFromFile("/settings/history");
                return show == null ? true : show;
            };

            service.setShowHistory = function(showHistory) {
                pushDataToFile("/settings/history", showHistory === true);
            };

            service.showStreamInfo = function() {
                const show = getDataFromFile("/settings/stream-info");
                return show == null ? true : show;
            };

            service.setShowStreamInfo = function(showStreamInfo) {
                pushDataToFile("/settings/stream-info", showStreamInfo === true);
            };

            service.getAllowedActivityEvents = function() {
                const events = getDataFromFile("/settings/allowedActivityEvents");
                return events == null ? [
                    "twitch:follow",
                    "twitch:viewer-arrived",
                    "twitch:banned",
                    "twitch:timeout",
                    "twitch:whisper",
                    "twitch:sub",
                    "twitch:subs-gifted",
                    "twitch:community-subs-gifted",
                    "twitch:host",
                    "twitch:raid"
                ] : events;
            };

            service.getAllowedActivityEventFilters = function() {
                const filters = getDataFromFile("/settings/allowedActivityEventFilters", true);
                return filters == null ? [
                    "filter: follow",
                    "filter: viewer",
                    "filter: sub",
                    "filter: host",
                    "filter: raid"
                ] : filters;
            };

            service.setAllowedActivityEvents = function(events) {
                if (events == null || !Array.isArray(events)) {
                    return;
                }
                pushDataToFile("/settings/allowedActivityEvents", events);
            };

            service.clearAllowedActivityEvents = () => {
                deleteDataAtPath("/settings/allowedActivityEvents");
            };

            service.setAllowedActivityEventFilters = function(filters) {
                if (filters == null || !Array.isArray(filters)) {
                    return;
                }
                pushDataToFile("/settings/allowedActivityEventFilters", filters);
            };

            service.ignoreSubsequentSubEventsAfterCommunitySub = function() {
                const ignoreSubEvents = getDataFromFile("/settings/ignoreSubsequentSubEventsAfterCommunitySub");
                return ignoreSubEvents != null ? ignoreSubEvents : true;
            };

            service.setIgnoreSubsequentSubEventsAfterCommunitySub = function(ignoreSubEvents) {
                pushDataToFile("/settings/ignoreSubsequentSubEventsAfterCommunitySub", ignoreSubEvents === true);
            };

            service.getWysiwygBackground = function() {
                const bg = getDataFromFile("/settings/wysiwygBackground");
                return bg != null ? bg : 'white';
            };

            service.setWysiwygBackground = function(bg) {
                pushDataToFile("/settings/wysiwygBackground", bg);
            };

            service.isChatCompactMode = function() {
                let compact = getDataFromFile("/settings/chatCompactMode");
                return compact != null ? compact : false;
            };

            service.setChatCompactMode = function(compact) {
                pushDataToFile("/settings/chatCompactMode", compact === true);
            };

            service.getShowAvatars = function() {
                const value = getDataFromFile("/settings/chatAvatars");
                return value != null ? value : true;
            };
            service.setShowAvatars = function(value) {
                pushDataToFile("/settings/chatAvatars", value === true);
            };

            service.getShowTimestamps = function() {
                const value = getDataFromFile("/settings/chatTimestamps");
                return value != null ? value : true;
            };
            service.setShowTimestamps = function(value) {
                pushDataToFile("/settings/chatTimestamps", value === true);
            };

            service.getShowThirdPartyEmotes = function() {
                const value = getDataFromFile("/settings/chatThirdPartyEmotes");
                return value != null ? value : true;
            };
            service.setShowThirdPartyEmotes = function(value) {
                pushDataToFile("/settings/chatThirdPartyEmotes", value === true);
            };

            service.getShowPronouns = function() {
                const value = getDataFromFile("/settings/chatPronouns");
                return value != null ? value : true;
            };
            service.setShowPronouns = function(value) {
                pushDataToFile("/settings/chatPronouns", value === true);
            };

            service.getChatCustomFontSizeEnabled = function() {
                const value = getDataFromFile("/settings/chatCustomFontSizeEnabled");
                return value != null ? value : false;
            };
            service.setChatCustomFontSizeEnabled = function(value) {
                pushDataToFile("/settings/chatCustomFontSizeEnabled", value === true);
            };

            service.getChatCustomFontSize = function() {
                const value = getDataFromFile("/settings/chatCustomFontSize");
                return value != null ? value : 17;
            };
            service.setChatCustomFontSize = function(value) {
                pushDataToFile("/settings/chatCustomFontSize", value);
            };

            service.chatAlternateBackgrounds = function() {
                let alternate = getDataFromFile('/settings/chatAlternateBackgrounds');
                return alternate != null ? alternate : true;
            };

            service.setChatAlternateBackgrounds = function(alternate) {
                pushDataToFile('/settings/chatAlternateBackgrounds', alternate === true);
            };

            service.getShowUptimeStat = function() {
                const value = getDataFromFile("/settings/showUptimeStat");
                return value != null ? value : true;
            };
            service.setShowUptimeStat = function(value) {
                pushDataToFile("/settings/showUptimeStat", value === true);
            };
            service.getShowViewerCountStat = function() {
                const value = getDataFromFile("/settings/showViewerCountStat");
                return value != null ? value : true;
            };
            service.setShowViewerCountStat = function(value) {
                pushDataToFile("/settings/showViewerCountStat", value === true);
            };

            service.setChatShowGifs = function(showGifs) {
                pushDataToFile('/settings/chatShowGifs', showGifs === true);
            };

            service.chatShowGifs = function() {
                let showGifs = getDataFromFile('/settings/chatShowGifs');
                return showGifs != null ? showGifs : true;
            };

            service.setChatShowStickers = function(showStickers) {
                pushDataToFile('/settings/chatShowStickers', showStickers === true);
            };

            service.chatShowStickers = function() {
                let showStickers = getDataFromFile('/settings/chatShowStickers');
                return showStickers != null ? showStickers : true;
            };

            service.chatHideDeletedMessages = function() {
                let hide = getDataFromFile('/settings/chatHideDeletedMessages');
                return hide != null ? hide : false;
            };

            service.setChatHideDeletedMessages = function(hide) {
                pushDataToFile('/settings/chatHideDeletedMessages', hide === true);
            };

            service.getOverlayCompatibility = function() {
                let overlay = getDataFromFile("/settings/overlayImages");
                return overlay != null ? overlay : "Other";
            };

            service.setOverlayCompatibility = function(overlay) {
                let overlaySetting = overlay === "OBS" ? overlay : "Other";
                pushDataToFile("/settings/overlayImages", overlaySetting);
            };

            service.getTheme = function() {
                let theme = getDataFromFile("/settings/theme");
                return theme != null ? theme : "Midnight";//默认背景颜色为Midnight风格
            };

            service.setTheme = function(theme) {
                pushDataToFile("/settings/theme", theme);
                gaService.sendEvent("theme", "change", theme);
            };

            service.soundsEnabled = function() {
                let sounds = getDataFromFile("/settings/sounds");
                return sounds != null ? sounds : "On";
            };

            service.setSoundsEnabled = function(enabled) {
                pushDataToFile("/settings/sounds", enabled);
            };

            service.getActiveChatUserListTimeout = function() {
                let inactiveTimer = getDataFromFile("/settings/activeChatUsers/inactiveTimer");
                return inactiveTimer != null ? parseInt(inactiveTimer) : 5;
            };

            service.setActiveChatUserListTimeout = function(inactiveTimer) {
                pushDataToFile("/settings/activeChatUsers/inactiveTimer", inactiveTimer);
            };

            service.getActiveMixplayUserListEnabled = function() {
                let status = getDataFromFile("/settings/activeMixplayUsers/status");
                return status != null ? status : true;
            };

            service.setActiveMixplayUsers = function(status) {
                pushDataToFile("/settings/activeMixplayUsers/status", status);
            };

            service.getActiveMixplayUserListTimeout = function() {
                let inactiveTimer = getDataFromFile("/settings/activeMixplayUsers/inactiveTimer");
                return inactiveTimer != null ? inactiveTimer : "10";
            };

            service.setActiveMixplayUserListTimeout = function(inactiveTimer) {
                pushDataToFile("/settings/activeMixplayUsers/inactiveTimer", inactiveTimer);
            };

            /*
            * 0 = off,
            * 1 = bugfix,
            * 2 = feature,
            * 3 = major release,
            * 4 = betas
            */
            service.getAutoUpdateLevel = function() {
                let updateLevel = getDataFromFile("/settings/autoUpdateLevel");
                return updateLevel != null ? updateLevel : 2;
            };

            service.setAutoUpdateLevel = function(updateLevel) {
                pushDataToFile("/settings/autoUpdateLevel", updateLevel);
            };

            service.notifyOnBeta = function() {
                let beta = getDataFromFile("/settings/notifyOnBeta");
                return beta != null ? beta : false;
            };

            service.setNotifyOnBeta = function(beta) {
                pushDataToFile("/settings/notifyOnBeta", beta === true);
            };

            service.isFirstTimeUse = function() {
                let ftu = getDataFromFile("/settings/firstTimeUse");
                return ftu != null ? ftu : true;
            };

            service.setFirstTimeUse = function(ftu) {
                pushDataToFile("/settings/firstTimeUse", ftu === true);
            };

            service.hasJustUpdated = function() {
                let updated = getDataFromFile("/settings/justUpdated");
                return updated != null ? updated : false;
            };

            service.setJustUpdated = function(justUpdated) {
                pushDataToFile("/settings/justUpdated", justUpdated === true);
            };

            service.getButtonViewMode = function(type) {
                if (type === "commands") {
                    let buttonViewMode = getDataFromFile(
                        "/settings/buttonViewModeCommands"
                    );
                    return buttonViewMode != null ? buttonViewMode : "list";
                }

                if (type === "liveEvents") {
                    let buttonViewMode = getDataFromFile(
                        "/settings/buttonViewModeLiveEvents"
                    );
                    return buttonViewMode != null ? buttonViewMode : "grid";
                }

                let buttonViewMode = getDataFromFile("/settings/buttonViewMode");
                return buttonViewMode != null ? buttonViewMode : "grid";
            };

            service.setButtonViewMode = function(buttonViewMode, type) {
                if (type === "commands") {
                    pushDataToFile("/settings/buttonViewModeCommands", buttonViewMode);
                } else if (type === "liveEvents") {
                    pushDataToFile("/settings/buttonViewModeLiveEvents", buttonViewMode);
                } else {
                    pushDataToFile("/settings/buttonViewMode", buttonViewMode);
                }
            };

            service.getOverlayVersion = function() {
                let version = getDataFromFile("/settings/copiedOverlayVersion");
                return version != null ? version : "";
            };

            service.setOverlayVersion = function(newVersion) {
                pushDataToFile("/settings/copiedOverlayVersion", newVersion.toString());
            };

            service.getWebServerPort = function() {
                let serverPort = getDataFromFile("/settings/webServerPort");
                return serverPort != null ? serverPort : 7473;
            };

            service.setWebServerPort = function(port) {
                // Ensure port is a number.
                if (!Number.isInteger(port)) {
                    return;
                }

                // Save to settings file for app front end
                pushDataToFile("/settings/webServerPort", port);

                let path = dataAccess.getPathInWorkingDir(
                    "/resources/overlay/js/port.js"
                );

                // Overwrite the 'port.js' file in the overlay settings folder with the new port
                fs.writeFile(path, `window.WEBSERVER_PORT = ${port}`, "utf8", () => {
                    logger.info(`Set overlay port to: ${port}`);
                });
            };

            service.getWebSocketPort = function() {
                return service.getWebServerPort();
            };

            service.setWebSocketPort = function(port) {
                return service.setWebServerPort(port);
            };

            service.setInactiveTimer = function(inactiveTimer) {
                console.log(inactiveTimer);
            };

            service.showOverlayInfoModal = function(instanceName) {
                utilityService.showOverlayInfoModal(instanceName);
            };

            service.showOverlayEventsModal = function() {
                utilityService.showOverlayEventsModal();
            };

            service.getOverlayEventsSettings = function() {
                let settings = getDataFromFile("/settings/eventSettings");
                return settings != null ? settings : {};
            };

            service.saveOverlayEventsSettings = function(eventSettings) {
                pushDataToFile("/settings/eventSettings", eventSettings);
            };

            service.sparkExemptionEnabled = function() {
                let enabled = getDataFromFile('/settings/sparkExemptionEnabled');
                return enabled != null ? enabled : false;
            };

            service.setSparkExemptionEnabled = function(enabled) {
                pushDataToFile('/settings/sparkExemptionEnabled', enabled === true);
            };

            service.mixPlayPreviewModeEnabled = function() {
                let enabled = getDataFromFile('/settings/mixplayPreviewMode');
                return enabled != null ? enabled : false;
            };

            service.setMixPlayPreviewModeEnabled = function(enabled) {
                pushDataToFile('/settings/mixplayPreviewMode', enabled === true);
            };

            service.centerGuideLinesEnabled = function() {
                let enabled = getDataFromFile('/settings/mixplayCenterGuideLines');
                return enabled != null ? enabled : false;
            };

            service.setCenterGuideLinesEnabled = function(enabled) {
                pushDataToFile('/settings/mixplayCenterGuideLines', enabled === true);
            };


            service.getClearCustomScriptCache = function() {
                let clear = getDataFromFile("/settings/clearCustomScriptCache");
                return clear != null ? clear : false;
            };

            service.setClearCustomScriptCache = function(clear) {
                pushDataToFile("/settings/clearCustomScriptCache", clear === true);
            };

            service.useOverlayInstances = function() {
                let oi = getDataFromFile("/settings/useOverlayInstances");
                return oi != null ? oi : false;
            };

            service.setUseOverlayInstances = function(oi) {
                pushDataToFile("/settings/useOverlayInstances", oi === true);
            };

            service.getOverlayInstances = function() {
                let ois = getDataFromFile("/settings/overlayInstances");
                return ois != null ? ois : [];
            };

            service.setOverlayInstances = function(ois) {
                pushDataToFile("/settings/overlayInstances", ois);
            };

            service.backupKeepAll = function() {
                let backupKeepAll = getDataFromFile("/settings/backupKeepAll");
                return backupKeepAll != null ? backupKeepAll : false;
            };

            service.setBackupKeepAll = function(backupKeepAll) {
                pushDataToFile("/settings/backupKeepAll", backupKeepAll === true);
            };

            service.backupOnExit = function() {
                let save = getDataFromFile("/settings/backupOnExit");
                return save != null ? save : true;
            };

            service.setBackupOnExit = function(backupOnExit) {
                pushDataToFile("/settings/backupOnExit", backupOnExit === true);
            };

            service.backupBeforeUpdates = function() {
                let backupBeforeUpdates = getDataFromFile(
                    "/settings/backupBeforeUpdates"
                );
                return backupBeforeUpdates != null ? backupBeforeUpdates : true;
            };

            service.setBackupBeforeUpdates = function(backupBeforeUpdates) {
                pushDataToFile(
                    "/settings/backupBeforeUpdates",
                    backupBeforeUpdates === true
                );
            };

            service.backupOnceADay = function() {
                let backupOnceADay = getDataFromFile("/settings/backupOnceADay");
                return backupOnceADay != null ? backupOnceADay : true;
            };

            service.setBackupOnceADay = function(backupOnceADay) {
                pushDataToFile("/settings/backupOnceADay", backupOnceADay === true);
            };

            service.maxBackupCount = function() {
                let maxBackupCount = getDataFromFile("/settings/maxBackupCount");
                return maxBackupCount != null ? maxBackupCount : 25;
            };

            service.setMaxBackupCount = function(maxBackupCount) {
                pushDataToFile("/settings/maxBackupCount", maxBackupCount);
            };

            service.getClipDownloadFolder = function() {
                let dlFolder = getDataFromFile('/settings/clips/downloadFolder');
                return dlFolder != null && dlFolder !== "" ? dlFolder : dataAccess.getPathInUserData("/clips/");
            };

            service.setClipDownloadFolder = function(filepath) {
                pushDataToFile('/settings/clips/downloadFolder', filepath);
            };

            service.getAudioOutputDevice = function() {
                let device = getDataFromFile("/settings/audioOutputDevice");
                return device != null
                    ? device
                    : { label: "System Default", deviceId: "default" };
            };

            service.setAudioOutputDevice = function(device) {
                pushDataToFile("/settings/audioOutputDevice", device);
            };

            service.getSidebarControlledServices = function() {
                let services = getDataFromFile("/settings/sidebarControlledServices");
                return services != null
                    ? services
                    : ["chat"];
            };

            service.setSidebarControlledServices = function(services) {
                pushDataToFile("/settings/sidebarControlledServices", services);
            };

            service.getTaggedNotificationSound = function() {
                let sound = getDataFromFile("/settings/chat/tagged/sound");
                return sound != null ? sound : { name: "None" };
            };

            service.setTaggedNotificationSound = function(sound) {
                pushDataToFile("/settings/chat/tagged/sound", sound);
            };

            service.getTaggedNotificationVolume = function() {
                let volume = getDataFromFile("/settings/chat/tagged/volume");
                return volume != null ? volume : 5;
            };

            service.setTaggedNotificationVolume = function(volume) {
                pushDataToFile("/settings/chat/tagged/volume", volume);
            };

            service.debugModeEnabled = function() {
                let globalSettings = dataAccess.getJsonDbInUserData("/global-settings");
                let enabled;
                try {
                    enabled = globalSettings.getData("/settings/debugMode");
                } catch (err) {} //eslint-disable-line no-empty
                return enabled != null ? enabled : false;
            };

            service.setDebugModeEnabled = function(enabled) {
                let globalSettings = dataAccess.getJsonDbInUserData("/global-settings");
                try {
                    globalSettings.push("/settings/debugMode", enabled === true);
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.getViewerColumnPreferences = function() {
                let prefs = getDataFromFile("/settings/viewerColumnPreferences");
                return prefs != null ? prefs : { lastSeen: true };
            };

            service.setViewerColumnPreferences = function(prefs) {
                pushDataToFile("/settings/viewerColumnPreferences", prefs);
            };

            service.deleteFromViewerColumnPreferences = function(columnName) {
                deleteDataAtPath("/settings/viewerColumnPreferences/" + columnName);
            };

            service.getExtraLifeParticipantId = function() {
                let id = getDataFromFile('/settings/extraLifeId');
                return id;
            };

            service.setExtraLifeParticipantId = function(id) {
                pushDataToFile('/settings/extraLifeId', id);
            };

            service.getDefaultTtsVoiceId = function() {
                let id = getDataFromFile('/settings/defaultTtsVoiceId');
                return id;
            };

            service.setDefaultTtsVoiceId = function(id) {
                pushDataToFile('/settings/defaultTtsVoiceId', id);
            };

            service.getTtsVoiceVolume = function() {
                let volume = getDataFromFile('/settings/ttsVoiceVolume');
                return volume !== undefined ? volume : 0.5;
            };

            service.setTtsVoiceVolume = function(volume) {
                pushDataToFile('/settings/ttsVoiceVolume', volume);
            };

            service.getTtsVoiceRate = function() {
                let rate = getDataFromFile('/settings/ttsVoiceRate');
                return rate !== undefined ? rate : 1;
            };

            service.setTtsVoiceRate = function(rate) {
                pushDataToFile('/settings/ttsVoiceRate', rate);
            };


            service.getWhileLoopEnabled = function() {
                let enabled = getDataFromFile('/settings/whileLoopEnabled');
                return enabled !== undefined ? enabled : false;
            };

            service.setWhileLoopEnabled = function(enabled) {
                pushDataToFile('/settings/whileLoopEnabled', enabled === true);
            };

            service.getStartAtLogin = function() {
                let enabled = getDataFromFile('/settings/startAtLogin');
                return enabled !== undefined ? enabled : false;
            };

            service.setStartAtLogin = function(enabled) {
                pushDataToFile('/settings/startAtLogin', enabled === true);
            };

            service.getLang = function() {
                let langKey = getDataFromFile('/settings/lang');
                return langKey !== undefined ? langKey : 'en';
            };

            service.setLang = function(langKey) {
                if (langKey !== service.getLang()) {
                    $route.reload();
                    $rootScope.$broadcast("langChanged", langKey);
                }
                pushDataToFile('/settings/lang', langKey);
                backendCommunicator.send("changeLanguage");
            };

            return service;
        });
}());
