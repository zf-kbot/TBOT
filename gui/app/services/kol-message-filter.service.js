"use strict";
(function () {

    const moment = require("moment");
    const uuid = require("uuid/v4");

    angular
        .module("twitcherbotApp")
        .factory("kolMessageFilterService", function (logger, connectionService, backendCommunicator, $q) {
            let service = {};
            service.kolMessageFiltersRepetitions = [{
                id: "234234345345",
                name: "shy-test1",
                is_active: true,
                duration: 5
            }];
            service.kolMessageFiltersEmotes = [{
                id: "789789yuiyu",
                name: "shy-test2",
                is_active: false,
                duration: 5
            }];
            service.kolMessageFiltersExcessCaps = [{
                id: "789789yuiyu",
                name: "shy-test2",
                is_active: false,
                duration: 20
            }];
            service.kolMessageFiltersSymbols = [{
                id: "789789yuiyu",
                name: "shy-test2",
                is_active: false,
                duration: 15
            }];

            service.loadKolMessageFilters = function () {
                // service.kolMessageFilters = [];
                // $q.when(backendCommunicator.fireEventAsync("getKolMessageFilters"))
                //     .then(kolMessageFilters => {
                //         if (kolMessageFilters) {
                //             service.kolMessageFilters = kolMessageFilters;
                //         }
                //     });
            };

            backendCommunicator.on("kolMessageFilterUpdate", kolMessageFilter => {
                if (kolMessageFilter == null || kolMessageFilter.id == null) return;
                service.saveKolMessageFilter(kolMessageFilter, false);
            });

            service.getKolMessageFilters = () => service.kolMessageFilters;

            service.getKolMessageFilterResult = function () {
                return {
                    "id": "ed961efd-8a3f-4cf5-a9d0-e616c590cd2a",
                    "broadcaster_id": "55696719",
                    "broadcaster_name": "TwitchDev",
                    "broadcaster_login": "twitchdev",
                    "title": "Heads or Tails?",
                    "choices": [
                        {
                            "id": "4c123012-1351-4f33-84b7-43856e7a0f47",
                            "title": "Heads",
                            "votes": 0,
                            "channel_points_votes": 0,
                            "bits_votes": 0
                        },
                        {
                            "id": "279087e3-54a7-467e-bcd0-c1393fcea4f0",
                            "title": "Tails",
                            "votes": 0,
                            "channel_points_votes": 0,
                            "bits_votes": 0
                        }
                    ],
                    "bits_voting_enabled": false,
                    "bits_per_vote": 0,
                    "channel_points_voting_enabled": false,
                    "channel_points_per_vote": 0,
                    "status": "ACTIVE",
                    "duration": 1800,
                    "started_at": "2021-03-19T06:08:33.871278372Z"
                }
            }

            service.saveKolMessageFilter = function (kolMessageFilter, notifyBackend = true) {
                logger.debug("saving kolMessageFilter: " + kolMessageFilter.name);
                if (kolMessageFilter.id == null || kolMessageFilter.id === "") {
                    kolMessageFilter.id = uuid();
                    kolMessageFilter.createdBy = connectionService.accounts.streamer.username;
                    kolMessageFilter.createdAt = moment().format();
                }

                const cleanedKolMessageFilter = JSON.parse(angular.toJson(kolMessageFilter));

                if (notifyBackend) {
                    //暂时先注释，不向后端发送请求
                    //backendCommunicator.fireEvent("saveKolMessageFilter", cleanedKolMessageFilter);
                }

                const currentIndex = service.kolMessageFilters.findIndex(t => t.id === cleanedKolMessageFilter.id);
                if (currentIndex < 0) {
                    service.kolMessageFilters.push(cleanedKolMessageFilter);
                } else {
                    service.kolMessageFilters[currentIndex] = cleanedKolMessageFilter;
                }
            };

            // Deletes a kolMessageFilter.
            service.deleteKolMessageFilter = function (kolMessageFilter) {
                if (kolMessageFilter == null) return;

                service.kolMessageFilters = service.kolMessageFilters.filter(t => t.id !== kolMessageFilter.id);
                //暂时先注释，不向后端发送请求
                // backendCommunicator.fireEvent("deleteKolMessageFilter", kolMessageFilter.id);
            };

            return service;
        });
}());
