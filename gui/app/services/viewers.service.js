"use strict";
(function () {
    //This handles viewer lists.

    angular
        .module("twitcherbotApp")
        .factory("viewersService", function (logger, settingsService, backendCommunicator, $q) {
            let service = {};

            // Check to see if the DB is turned on or not.
            service.isViewerDbOn = function () {
                return settingsService.getViewerDB();
            };

            service.viewers = [];
            let waitingForUpdate = false;
            service.updateViewers = function () {
                if (waitingForUpdate) return Promise.resolve();
                waitingForUpdate = true;
                return $q(resolve => {
                    // backendCommunicator.fireEventAsync("getAllViewers")
                    backendCommunicator.fireEventAsync("getSimplifyAllViewers")
                        .then(viewers => {
                            resolve(viewers);
                        });
                }).then(viewers => {
                    service.viewers = viewers;
                    waitingForUpdate = false;
                    service.updateViewersXp();
                });
            };

            function mergeTwoArrayByColumn(obj1, obj2, column) {
                obj1.forEach((v1) => {
                    obj2.forEach((v2) => {
                        if (v1[column] === v2[column]) {
                            Object.keys(v2).forEach((k) => {
                                v1[k] = v2[k];
                            });
                            return;
                        }
                    });
                });
            }

            service.updateViewersXp = function () {
                if (waitingForUpdate) return Promise.resolve();
                waitingForUpdate = true;
                return $q(resolve => {
                    // backendCommunicator.fireEventAsync("getAllViewers")
                    backendCommunicator.fireEventAsync("getSimplifyAllViewersXp")
                        .then(viewersXp => {
                            resolve(viewersXp);
                        });
                }).then(viewersXp => {
                    mergeTwoArrayByColumn(service.viewers, viewersXp, "_id");
                    waitingForUpdate = false;
                });
            };

            service.updateViewer = function (userId) {
                return $q(resolve => {
                    backendCommunicator.fireEventAsync("getViewerTwitchbotData", userId)
                        .then(viewer => {
                            resolve(viewer);
                        });
                }).then(viewer => {
                    if (viewer) {
                        let index = service.viewers.findIndex(v => v._id === viewer._id);
                        if (index >= 0) {
                            service.viewers[index] = viewer;
                        }
                    }
                });
            };

            service.updateBannedStatus = (username, shouldBeBanned) => {
                backendCommunicator.fireEvent("update-user-banned-status", { username, shouldBeBanned });
            };

            service.updateModStatus = (username, shouldBeMod) => {
                backendCommunicator.fireEvent("update-user-mod-status", { username, shouldBeMod });
            };

            service.toggleFollowOnChannel = (channelIdToFollow, shouldFollow = true) => {
                backendCommunicator.fireEvent("toggleFollowOnChannel", { channelIdToFollow, shouldFollow });
            };

            // Did user see warning alert about connecting to chat first?
            service.sawWarningAlert = true;
            return service;
        });
}());
