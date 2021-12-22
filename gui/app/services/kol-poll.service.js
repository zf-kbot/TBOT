"use strict";
(function () {

    const moment = require("moment");
    const uuid = require("uuid/v4");

    angular
        .module("twitcherbotApp")
        .factory("kolPollService", function (logger, connectionService, backendCommunicator, $q) {
            let service = {};

            service.kolPolls = [];

            service.viewKolPollResult = {};

            service.loadKolPolls = function () {
                service.kolPolls = [];
                $q.when(backendCommunicator.fireEventAsync("getKolPolls"))
                    .then(kolPolls => {
                        if (kolPolls) {
                            service.kolPolls = kolPolls;
                        }
                    });
            };

            service.beginKolPoll = function (kolPoll) {
                return $q.when(backendCommunicator.fireEventAsync("beginKolPoll", kolPoll));
            };

            service.endKolPoll = function (kolPoll) {
                return $q.when(backendCommunicator.fireEventAsync("endKolPoll", kolPoll));
            };

            backendCommunicator.on("kolPollUpdate", kolPoll => {
                if (kolPoll == null || kolPoll.id == null) return;
                service.saveKolPoll(kolPoll, false);
            });

            service.getKolPolls = () => service.kolPolls;

            service.getKolPollResult = function (twitchPollId) {
                $q.when(backendCommunicator.fireEventAsync("viewKolPoll", twitchPollId))
                    .then(viewKolPollResult => {
                        if (viewKolPollResult) {
                            service.viewKolPollResult = viewKolPollResult;
                            let current = new Date().getTime();
                            let startAt = new Date(viewKolPollResult.started_at).getTime();
                            if (startAt + viewKolPollResult.duration * 1000 < current || viewKolPollResult.status === "TERMINATED") {
                                service.viewKolPollResult.leftTime = 0;
                            } else {
                                service.viewKolPollResult.leftTime = parseInt((startAt + viewKolPollResult.duration * 1000 - current) / 1000);
                            }
                        }
                    });
            };

            service.saveKolPoll = function (kolPoll, notifyBackend = true) {
                logger.debug("saving kolPoll: " + kolPoll.title);
                if (kolPoll.id == null || kolPoll.id === "") {
                    kolPoll.id = uuid();
                    kolPoll.createdBy = connectionService.accounts.streamer.username;
                    kolPoll.createdAt = moment().format();
                }

                const cleanedKolPoll = JSON.parse(angular.toJson(kolPoll));

                if (notifyBackend) {
                    backendCommunicator.fireEvent("saveKolPoll", cleanedKolPoll);
                }

                const currentIndex = service.kolPolls.findIndex(t => t.id === cleanedKolPoll.id);
                if (currentIndex < 0) {
                    service.kolPolls.push(cleanedKolPoll);
                } else {
                    service.kolPolls[currentIndex] = cleanedKolPoll;
                }
            };

            // Deletes a kolPoll.
            service.deleteKolPoll = function (kolPoll) {
                if (kolPoll == null) return;

                service.kolPolls = service.kolPolls.filter(t => t.id !== kolPoll.id);
                backendCommunicator.fireEvent("deleteKolPoll", kolPoll.id);
            };

            return service;
        });
}());
