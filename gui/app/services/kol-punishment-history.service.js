"use strict";
(function () {
    //This handles viewer lists.

    angular
        .module("twitcherbotApp")
        .factory("punishmentHistoryService", function (logger, settingsService, backendCommunicator, $q) {
            let service = {};

            service.viewers = [];

            service.updateViewers = function () {
                return $q(() => {
                    backendCommunicator.fireEventAsync("getPunishmentHistoryLogs")
                        .then(viewers => {
                            service.viewers = viewers;
                        });
                });
            };
            service.updateViewers();
            service.sawWarningAlert = true;
            return service;
        });
}());
