"use strict";
(function () {

    const moment = require("moment");
    const uuid = require("uuid/v4");

    angular
        .module("twitcherbotApp")
        .factory("kolTimerService", function (logger, connectionService, backendCommunicator, $q) {
            let service = {};

            service.kolTimers = [];

            service.loadKolTimers = function () {
                $q.when(backendCommunicator.fireEventAsync("getTimers"))
                    .then(timers => {
                        if (timers) {
                            service.kolTimers = timers;
                        }
                    });
            };

            backendCommunicator.on("timerUpdate", timer => {
                if (timer == null || timer.id == null) return;
                service.saveKolTimer(timer, false);
            });

            service.getKolTimers = () => service.kolTimers;

            service.saveKolTimer = function (timer, notifyBackend = true) {
                logger.debug("saving timer: " + timer.name);
                if (timer.id == null || timer.id === "") {
                    timer.id = uuid();
                    timer.createdBy = connectionService.accounts.streamer.username;
                    timer.createdAt = moment().format();
                }

                const cleanedTimer = JSON.parse(angular.toJson(timer));

                //创建/修改对应的effects列表;
                if (cleanedTimer.message) {
                    if (cleanedTimer.effects && angular.isDefined(cleanedTimer.effects.id)) {
                        cleanedTimer.effects.list = [
                            {
                                "chatter": "Streamer",
                                "effectLabel": cleanedTimer.message,
                                "id": uuidv1(),
                                "message": cleanedTimer.message,
                                "type": "twitcherbot:chat"
                            }
                        ];
                    } else {
                        cleanedTimer.effects = {
                            "id": uuidv1(),
                            "list": [
                                {
                                    "chatter": "Streamer",
                                    "effectLabel": cleanedTimer.message,
                                    "id": uuidv1(),
                                    "message": cleanedTimer.message,
                                    "type": "twitcherbot:chat"
                                },
                            ],
                            "queue": null,
                            "queueDuration": 10,
                            "queuePriority": "high"
                        }
                    }
                }

                if (notifyBackend) {
                    backendCommunicator.fireEvent("saveTimer", cleanedTimer);
                }

                const currentIndex = service.kolTimers.findIndex(t => t.id === cleanedTimer.id);
                if (currentIndex < 0) {
                    service.kolTimers.push(cleanedTimer);
                } else {
                    service.kolTimers[currentIndex] = cleanedTimer;
                }
            };

            // Deletes a timer.
            service.deleteKolTimer = function (timer) {
                if (timer == null) return;

                service.kolTimers = service.kolTimers.filter(t => t.id !== timer.id);

                backendCommunicator.fireEvent("deleteTimer", timer.id);
            };

            return service;
        });
}());
