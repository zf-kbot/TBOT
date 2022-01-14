"use strict";
(function() {

    angular
        .module("twitcherbotApp")
        .factory("kolHistoryService", function(
            $rootScope, $translate, profileManager, settingsService, backendCommunicator, logger
        ) {
            let service = {};
            service.historyQueue = [];

            function getHistoryFile() {
                return profileManager.getJsonDbInProfile('/history');
            }

            function pushDataToFile(path, data) {
                try {
                    getHistoryFile().push(path, data, true);
                } catch (err) { } //eslint-disable-line no-empty
            }

            // 保存到本地
            function saveHistoryMsg(path, msg) {
                pushDataToFile(path, msg);
            }

            // 保存到本地
            function getHistoryMsgs(path) {
                try {
                    let data = getHistoryFile().getData(path);
                    return data ? data : [];
                } catch (err) {
                    return [];
                }
            }

            service.accounts = null;
            service.pushHistoryMsg = (message) => {
                let now = new Date();
                let minutes = now.getMinutes();
                minutes = minutes < 10 ? '0' + minutes : minutes;
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
                let msg = {
                    date: `${now.getDate()} ${monthNames[now.getMonth()]}, ${now.getFullYear()}`,
                    timestamp: `${now.getHours()}:${minutes}`,
                    message: message
                };
                service.historyQueue.unshift(msg);
                service.freshTranslate();
                saveHistoryMsg(`/msgs/${service.accounts.streamer.username}[]`, msg);
            };

            service.loadHistoryMsgs = (init = true) => {
                if (init) {
                    service.getAccounts();
                }
                if (service.accounts && service.accounts.hasOwnProperty('streamer') && service.accounts.streamer.hasOwnProperty('username')) {
                    service.historyQueue = getHistoryMsgs(`/msgs/${service.accounts.streamer.username}`);
                    service.historyQueue = service.historyQueue.slice(-100).reverse();
                    $translate.use(settingsService.getLang()).then(() => {
                        service.freshTranslate(true);
                    });
                } else {
                    service.historyQueue = [];
                }
            };

            // update account name after login or logout
            backendCommunicator.on("accountUpdate", accounts => {
                service.accounts = accounts;
                service.loadHistoryMsgs(false);
            });

            service.getAccounts = () => {
                service.accounts = backendCommunicator.fireEventSync("getAccounts");
            };

            $rootScope.$on("langChanged", () => {
                service.freshTranslate(true);
            });

            service.freshTranslate = (freshAll = false) => {
                service.historyQueue.forEach((hisotry) => {
                    if (!freshAll && hisotry.messageDisplay) { // 有翻译结果无需处理
                        return;
                    }
                    hisotry.message = hisotry.message.split(": ")[0];
                    $translate(`DASHBOARD.HISTORY.MESSAGE.${hisotry.message}`.replace(/ /g, '_')).then((ret) => {
                        hisotry.messageDisplay = ret;
                    }).catch((e) => {
                        hisotry.messageDisplay = hisotry.message;
                    });
                });
            };

            return service;
        });
}());