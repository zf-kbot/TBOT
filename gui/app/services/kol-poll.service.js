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
                        }
                    });
                // return service.viewKolPollResult;
                // return {
                //     "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
                //     "broadcaster_id": "55696719",
                //     "broadcaster_name": "TwitchDev",
                //     "broadcaster_login": "twitchdev",
                //     "title": "Heads or Tails?",
                //     "choices": [
                //         {
                //             "id": "4c123012-1351-4f33-84b7-43856e7a0f47",
                //             "title": "Heads",
                //             "votes": 0,
                //             "channel_points_votes": 0,
                //             "bits_votes": 0
                //         },
                //         {
                //             "id": "279087e3-54a7-467e-bcd0-c1393fcea4f0",
                //             "title": "Tails",
                //             "votes": 0,
                //             "channel_points_votes": 0,
                //             "bits_votes": 0
                //         }
                //     ],
                //     "bits_voting_enabled": false,
                //     "bits_per_vote": 0,
                //     "channel_points_voting_enabled": false,
                //     "channel_points_per_vote": 0,
                //     "status": "ACTIVE",
                //     "duration": 1800,
                //     "started_at": "2021-03-19T06:08:33.871278372Z"
                // };
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
