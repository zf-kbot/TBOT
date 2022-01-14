"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolTimersController", function ($scope, kolTimerService, utilityService, gaService, kolHistoryService, logger, $translate) {
            gaService.sendEvent('timers', 'open');
            $scope.kolTimerService = kolTimerService;
            $scope.translations = {
                "TIMERS.CONFIRMMODAL.TITLE": "",
                "TIMERS.CONFIRMMODAL.QUESTION": "",
                "TIMERS.CONFIRMMODAL.CONFIRMlABEL_DELETE": "",
                "TIMERS.CONFIRMMODAL.CONFIRMlABEL_CANCEL": ""
            };
            const translationRes = $translate.instant(Object.keys($scope.translations));
            for (let key in $scope.translations) {
                if ({}.hasOwnProperty.call($scope.translations, key)) {
                    $scope.translations[key] = translationRes[key];
                }
            }
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
                        title: $scope.translations['TIMERS.CONFIRMMODAL.TITLE'],
                        question: $scope.translations['TIMERS.CONFIRMMODAL.QUESTION'],
                        confirmLabel: $scope.translations['TIMERS.CONFIRMMODAL.CONFIRMlABEL_DELETE'],
                        cancelLabel: $scope.translations['TIMERS.CONFIRMMODAL.CONFIRMlABEL_CANCEL'],
                        confirmBtnType: "btn-info"
                    })
                    .then(confirmed => {
                        if (confirmed) {
                            kolHistoryService.pushHistoryMsg(`Deleted a new timer: ${kolTimer.name}`);
                            kolTimerService.deleteKolTimer(kolTimer);
                        }
                    });
            };
        });
}());
