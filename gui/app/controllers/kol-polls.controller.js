"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolPollsController", function ($scope, logger, kolPollService, utilityService, gaService, kolHistoryService, ngToast) {
            gaService.sendEvent('poll', 'open');
            $scope.kolPollService = kolPollService;

            //获取对应的选项设置
            $scope.getPollOptionsStrings = function (kolPoll) {
                return kolPoll.choices.length > 0 ? kolPoll.choices.map(item => item.title).join(" | ") : "--";
            };

            $scope.togglePollStatus = (kolPoll) => {
                //判断是否已经完成投票，如果已经完成，则不允许继续操作
                if (kolPoll.twitchPoll && kolPoll.twitchPoll.status != 'ACTIVE') {
                    ngToast.create("this poll is finished");
                    return false;
                }
                if (!kolPoll.is_active) {
                    kolPollService.beginKolPoll(kolPoll).then((data) => {
                        if (data.type == 'success') {
                            kolPoll.is_active = true;
                            return;
                        } else if (data.type == 'error') {
                            kolPoll.is_active = false;
                            if (data.data && data.data._body) {
                                if (data.data._statusCode == 403) {
                                    ngToast.create("you are not a twitch partner or affiliate");
                                } else if (data.data._statusCode == 401) {
                                    ngToast.create("you dont have the permission to start a poll");
                                }
                            }
                        }
                    });
                    kolHistoryService.pushHistoryMsg(`Began a poll: ${kolPoll.title}`);
                } else {
                    kolPollService.endKolPoll(kolPoll).then((data) => {
                        if (data.type == 'success') {
                            kolPoll.is_active = false;
                            return;
                        } else if (data.type == 'error') {
                            kolPoll.is_active = true;
                            if (data.data && data.data._body) {
                                if (data.data._statusCode == 403) {
                                    ngToast.create("you are not a twitch partner or affiliate");
                                } else if (data.data._statusCode == 401) {
                                    ngToast.create("you dont have the permission to start a poll");
                                }
                            }
                        }
                    });
                    kolHistoryService.pushHistoryMsg(`Ended a poll: ${kolPoll.title}`);
                }
            };

            $scope.openEditKolPollSettingsModal = function (kolPoll) {
                utilityService.showModal({
                    component: "addOrEditKolPollModal",
                    resolveObj: {
                        kolPoll: () => kolPoll
                    },
                    closeCallback: resp => {
                        let action = resp.action,
                            kolPoll = resp.kolPoll;

                        switch (action) {
                            case "add":
                                kolHistoryService.pushHistoryMsg(`Added a new poll: ${kolPoll.title}`);
                                gaService.sendEvent('poll', 'new');
                                kolPollService.saveKolPoll(kolPoll);
                                break;
                            case "update":
                                kolHistoryService.pushHistoryMsg(`Updated a poll: ${kolPoll.title}`);
                                kolPollService.saveKolPoll(kolPoll);
                                break;
                        }
                        // const action = resp.action;

                        // if (action === 'save') {
                        //     const updatedKolPoll = resp.kolPoll;
                        //     if (updatedKolPoll == null) return;
                        //     kolPollService.saveKolPoll(updatedKolPoll);
                        // }

                        // if (action === 'reset') {
                        //     kolPollService.resetKolPollToDefault(resp.kolPollId);
                        // }
                    }
                });
            };

            $scope.viewKolPollResult = function (kolPoll) {
                if (kolPoll && kolPoll.twitchPoll && kolPoll.twitchPoll.id) {
                    utilityService.showModal({
                        component: "viewKolPollResultModal",
                        resolveObj: {
                            kolPoll: () => kolPoll
                        }
                    });
                } else {
                    ngToast.create("this poll is not ended,you cant view the result");
                }
            };

            //删除指定的投票
            $scope.delete = function (kolPoll) {
                if (kolPoll == null) return;
                utilityService
                    .showConfirmationModal({
                        title: "DELETE POLL",
                        question: "Do you want to delete this poll?",
                        confirmLabel: "DELETE",
                        confirmBtnType: "btn-info"
                    })
                    .then(confirmed => {
                        if (confirmed) {
                            // connectionService.switchProfiles(profileId);
                            kolPollService.deleteKolPoll(kolPoll);
                            kolHistoryService.pushHistoryMsg(`Deleted poll: ${kolPoll.title}`);
                        }
                    });
            };
        });
}());
