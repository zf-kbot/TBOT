"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolTimersController", function ($scope, kolTimerService, utilityService, gaService, kolHistoryService, logger) {
            gaService.sendEvent('timers', 'open');
            $scope.kolTimerService = kolTimerService;

            console.info($scope.kolTimerService);

            $scope.toggleTimerStatus = function (kolTimer) {
                kolTimer.active = !kolTimer.active;
                kolTimerService.saveKolTimer(kolTimer);
                if (kolTimer.active) {
                    kolHistoryService.pushHistoryMsg(`Began a new timer: ${kolTimer.name}`);
                } else {
                    kolHistoryService.pushHistoryMsg(`Ended a new timer: ${kolTimer.name}`);
                }
            };

            $scope.openEditKolTimerSettingsModal = function (kolTimer) {
                utilityService.showModal({
                    component: "addOrEditKolTimerModal",
                    resolveObj: {
                        kolTimer: () => kolTimer
                    },
                    closeCallback: resp => {
                        let action = resp.action,
                            kolTimer = resp.kolTimer;

                        switch (action) {
                        case "add":
                            gaService.sendEvent('timers', 'new');
                            kolHistoryService.pushHistoryMsg(`Added a new timer: ${kolTimer.name}`);
                            kolTimerService.saveKolTimer(kolTimer);
                            break;
                        case "update":
                            kolHistoryService.pushHistoryMsg(`Updated a new timer: ${kolTimer.name}`);
                            kolTimerService.saveKolTimer(kolTimer);
                            break;
                        case "delete":
                            kolTimerService.deleteKolTimer(kolTimer);
                            break;
                        }
                    }
                });
            };

            $scope.deleteKolTimer = kolTimer => {
                if (kolTimer == null) return;
                utilityService
                    .showConfirmationModal({
                        title: "DELETE TIME",
                        question: "Do you want to delete this timer?",
                        confirmLabel: "DELETE",
                        confirmBtnType: "btn-info"
                    })
                    .then(confirmed => {
                        if (confirmed) {
                            kolHistoryService.pushHistoryMsg(`deleted a new timer: ${kolTimer.name}`);
                            kolTimerService.deleteKolTimer(kolTimer);
                        }
                    });
            };
        });
}());
