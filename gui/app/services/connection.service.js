"use strict";

(function() {
    // This handles logins and connections to mixer interactive

    const dataAccess = require("../../backend/common/data-access.js");

    angular
        .module("twitcherbotApp")
        .factory("connectionService", function(listenerService, soundService, $rootScope, backendCommunicator,
            logger, accountAccess, settingsService, utilityService, integrationService, gaService, profileManager, $q) {
            let service = {};

            backendCommunicator.on("accountUpdate", accounts => {
                service.accounts = accounts;
            });
            service.getAccounts = () => {
                service.accounts = backendCommunicator.fireEventSync("getAccounts");
            };
            service.getAccounts();

            let defaultPhotoUrl = "../images/placeholders/login.png";
            service.streamerConnectedInfo = {
                userName: '',
                connectedMins: 0,
                totalFollowers: 0
            };
            //ga发送连接时长和关注总人数
            service.sendConnectedTimeAndTotalFollowers = () => {
                $q.when(backendCommunicator.fireEventAsync("getStreamerFollowers"))
                    .then(result => {
                        service.streamerConnectedInfo.totalFollowers = result;
                        gaService.sendEvent(
                            'user',
                            `connected_time/min`,
                            service.streamerConnectedInfo.userName + ' : ' + Math.floor(service.streamerConnectedInfo.connectedMins) + ',' + ' total followers:' + service.streamerConnectedInfo.totalFollowers);
                    });
            };

            //积分计算公式,每x条数据，奖励bonus积分
            service.calculatorPoints = (queryDataResult, x = 1, bonus = 1) => {
                //排除0不能作除数,且x非负
                if (x <= 0) {
                    x = 1;
                }
                return Math.floor(queryDataResult / x) * bonus;
            };

            /**
             * Login Stuff
             */

            service.getAccountAvatar = function(type) {
                if (type !== "streamer" && type !== "bot" && service.accounts[type] != null) return defaultPhotoUrl;
                return service.accounts[type].avatar || defaultPhotoUrl;
            };

            // Login Kickoff
            service.loginOrLogout = function(type) {
                if (type === "streamer") {
                    if (service.accounts.streamer.loggedIn) {
                        service.logout(type);
                    } else {
                        const url = `http://localhost:${settingsService.getWebServerPort()}/api/v1/auth?providerId=${encodeURIComponent("twitch:streamer-account")}`;
                        backendCommunicator.send("click-twitch-login", { url: url });
                    }
                } else if (type === "bot") {
                    if (service.accounts.bot.loggedIn) {
                        service.logout(type);
                    } else {
                        utilityService.showModal({
                            component: "botLoginModal",
                            size: 'sm'
                        });
                    }
                }
            };

            service.logout = (type) => {
                if (type !== "streamer" && type !== "bot") return;
                if (service.accounts[type].loggedIn) {
                    accountAccess.logoutAccount(type);
                }
            };

            // Create new profile
            service.createNewProfile = function(profileId) {
                ipcRenderer.send("createProfile", profileId);
            };

            service.renameProfile = function(newProfileId) {
                ipcRenderer.send("renameProfile", newProfileId);
            };

            // delete profile
            service.deleteProfile = function() {
                ipcRenderer.send("deleteProfile");
            };

            // switch profile
            service.switchProfiles = function(profileId) {
                ipcRenderer.send("switchProfile", profileId);
            };

            service.profiles = [];
            //load profiles
            service.loadProfiles = () => {
                // Get full list of active profiles.

                let activeProfileIds;
                try {
                    let globalSettingDb = dataAccess.getJsonDbInUserData("./global-settings");
                    activeProfileIds = globalSettingDb.getData("./profiles/activeProfiles");
                } catch (err) {
                    logger.warn("Couldnt load active profiles.");
                    return;
                }

                if (activeProfileIds == null) return;

                let profiles = [];
                for (let profileId of activeProfileIds) {
                    let profile = {
                        username: "User",
                        avatar: defaultPhotoUrl,
                        profileId: profileId
                    };

                    // Try to get streamer settings for this profile.
                    // If it exists, overwrite defaults.
                    let streamer;
                    try {
                        let profileDb = dataAccess.getJsonDbInUserData("./profiles/" + profileId + "/auth-twitch");
                        streamer = profileDb.getData("/streamer");
                    } catch (err) {
                        logger.info("Couldnt get streamer data for profile " + profileId + " while updating the UI. Its possible this account hasnt logged in yet.");
                    }

                    if (streamer) {
                        if (streamer.username) {
                            profile.username = streamer.username;
                        }
                        if (streamer.avatar) {
                            profile.avatar = streamer.avatar;
                        }
                    }

                    profiles.push(profile);
                }

                service.profiles = profiles;
            };

            service.isConnectingAll = false;

            /*
             * NEW CONNECTION HANDLING
             */

            /**
             * Each connection state
             * @readonly
             * @enum {string}
             */
            const ConnectionState = Object.freeze({
                Connected: "connected",
                Disconnected: "disconnected",
                Connecting: "connecting",
                Reconnecting: "reconnecting"
            });

            service.connections = {
                chat: ConnectionState.Disconnected
            };

            // this can be 'disconnected', 'partial', or 'connected'
            service.sidebarServicesOverallStatus = 'disconnected';
            function updateSidebarServicesOverallStatus() {
                let oneDisconnected = false;
                let oneConnected = false;
                const serviceIds = settingsService.getSidebarControlledServices();
                for (const serviceId of serviceIds) {

                    if (serviceId == null || (serviceId !== "chat" && !serviceId.startsWith("integration."))) continue;

                    if (service.connections[serviceId] === ConnectionState.Connected) {
                        oneConnected = true;
                    } else {
                        oneDisconnected = true;
                    }
                }
                if (oneDisconnected) {
                    service.sidebarServicesOverallStatus = oneConnected ? 'partial' : 'disconnected';
                } else {
                    service.sidebarServicesOverallStatus = 'connected';
                }
                logger.debug(`Set overall sidebar service status to "${service.sidebarServicesOverallStatus}"`);
            }

            // this can be 'disconnected', connected'
            service.integrationsOverallStatus = ConnectionState.Disconnected;
            function updateIntegrationsOverallStatus() {
                let oneDisconnected = false;
                for (const integration of integrationService.getLinkedIntegrations()) {
                    const intServiceId = `integration.${integration.id}`;
                    if (service.connections[intServiceId] !== ConnectionState.Connected) {
                        oneDisconnected = true;
                        break;
                    }
                }
                if (oneDisconnected) {
                    service.integrationsOverallStatus = 'disconnected';
                } else {
                    service.integrationsOverallStatus = 'connected';
                }
            }

            for (const integration of integrationService.getLinkedIntegrations()) {
                const intServiceId = `integration.${integration.id}`;
                service.connections[intServiceId] = ConnectionState.Disconnected;
            }

            service.ConnectionState = ConnectionState;

            service.connectToService = function(serviceId) {
                backendCommunicator.send("connect-service", serviceId);
            };

            service.disconnectFromService = function(serviceId) {
                backendCommunicator.send("disconnect-service", serviceId);
            };

            service.toggleConnectionToService = function(serviceId) {
                if (service.connections[serviceId] == null) return;
                if (service.connections[serviceId] === 'connected') {
                    service.disconnectFromService(serviceId);
                } else {
                    service.connectToService(serviceId);
                }
            };

            backendCommunicator.on("auth-success", () => {
                service.connectSidebarControlledServices();
            });
            backendCommunicator.on("need-reconnect", () => {
                service.connectSidebarControlledServices();
            });
            service.connectSidebarControlledServices = () => {
                service.isConnectingAll = true;
                backendCommunicator.send("connect-sidebar-controlled-services");
            };
            service.disconnectSidebarControlledServices = () => backendCommunicator.send("disconnect-sidebar-controlled-services");
            service.toggleSidebarControlledServices = () => {
                if (service.isConnectingAll) return;
                if (service.sidebarServicesOverallStatus === 'disconnected') {
                    soundService.resetPopCounter();
                    service.connectSidebarControlledServices();
                    logger.debug("Triggering connection of all sidebar controlled services");
                } else {
                    service.disconnectSidebarControlledServices();
                    logger.debug("Triggering disconnection of all sidebar controlled services");
                }
            };

            backendCommunicator.on("connect-services-complete", () => {
                service.isConnectingAll = false;
                if (service.sidebarServicesOverallStatus === 'disconnected') {
                    soundService.connectSound("Offline");
                } else {
                    soundService.connectSound("Online");
                }
            });

            backendCommunicator.on("toggle-connections-started", () => {
                soundService.resetPopCounter();
                service.isConnectingAll = true;
            });

            const playConnectionStatusSound = utilityService.debounce(connectionState => {
                let soundType = connectionState === ConnectionState.Connected ? "Online" : "Offline";
                soundService.connectSound(soundType);
            }, 250);

            backendCommunicator.on("service-connection-update", (data) => {
                /**@type {string} */
                const serviceId = data.serviceId;
                /**@type {ConnectionState} */
                const connectionState = data.connectionState;
                if (data.serviceId === "chat") {
                    if (data.connectionState === ConnectionState.Connected) {
                        let now = new Date().getTime();
                        profileManager.getJsonDbInProfile('/gaInfo').push('/connectedTime', now, true);
                    } else if (data.connectionState === ConnectionState.Disconnected) {
                        let connectedBeginTime = profileManager.getJsonDbInProfile('/gaInfo').getData('/connectedTime', true);
                        let username = profileManager.getJsonDbInProfile('/auth-twitch').getData('/streamer/username', true);
                        let connectedMins = parseInt((new Date().getTime() - connectedBeginTime) / 1000) / 60;
                        service.streamerConnectedInfo.userName = username;
                        service.streamerConnectedInfo.connectedMins = connectedMins;
                        /*这里目前不需要主动弹出反馈的弹窗了，暂时屏蔽 */
                        // let feedbackInfo = profileManager.getJsonDbInProfile('/feedbackInfo').getData('/', true);
                        let threshold = {
                            connectedMins: 5,
                            popupIntervalMins: 20,
                            gaSendMinMins: 1
                        };
                        // if (connectedMins >= threshold.connectedMins && data.manual
                        //     && (!('isParticipate' in feedbackInfo) || ('isParticipate' in feedbackInfo && !feedbackInfo.isParticipate))
                        //     && (!('latestPopupTime' in feedbackInfo) || ('latestPopupTime' in feedbackInfo
                        //     && (new Date().getTime() - feedbackInfo.latestPopupTime) / 1000 / 60 >= threshold.popupIntervalMins))) { // 连接超过20min、未填写、1h内未弹出
                        //     utilityService.showModal({
                        //         component: "showKolFeedbackModal"
                        //     });
                        // }
                        if (connectedMins > threshold.gaSendMinMins) {
                            //断开连接时发送用户名，连接时长和当前关注人数
                            service.sendConnectedTimeAndTotalFollowers();
                        }
                    }
                }
                //see if there has been no change
                if (service.connections[serviceId] === connectionState) return;

                if (connectionState === ConnectionState.Connected || connectionState === ConnectionState.Disconnected) {
                    if (!service.isConnectingAll) {
                        playConnectionStatusSound(connectionState);
                    } else {
                        if (connectionState === ConnectionState.Connected) {
                            soundService.popSound();
                        }
                    }
                }

                service.connections[serviceId] = connectionState;

                updateSidebarServicesOverallStatus();

                if (serviceId.startsWith("integration.")) {
                    updateIntegrationsOverallStatus();
                }

                $rootScope.$broadcast("connection:update", {
                    type: serviceId,
                    status: connectionState
                });
            });

            backendCommunicator.on("integrationLinked", (intId) => {
                const serviceId = `integration.${intId}`;
                service.connections[serviceId] = ConnectionState.Disconnected;
            });

            backendCommunicator.on("integrationUnlinked", (intId) => {
                const serviceId = `integration.${intId}`;
                delete service.connections[serviceId];
            });

            backendCommunicator.on("show-feedback", () => {
                utilityService.showModal({
                    component: "showKolFeedbackModal"
                });
            });

            /*
             * OLD CONNECTION STUFF. TODO: Delete
             */
            service.connectedBoard = "";

            // Connection Monitor for Overlay
            // Recieves event from main process that connection has been established or disconnected.
            let ListenerType = listenerService.ListenerType;
            listenerService.registerListener(
                { type: ListenerType.OVERLAY_CONNECTION_STATUS },
                overlayStatusData => {
                    let status;
                    if (!overlayStatusData.serverStarted) {
                        status = "disconnected";
                    } else if (overlayStatusData.clientsConnected) {
                        status = "connected";
                    } else {
                        status = "warning";
                    }

                    $rootScope.$broadcast("connection:update", {
                        type: "overlay",
                        status: status
                    });
                }
            );

            return service;
        });
}());
