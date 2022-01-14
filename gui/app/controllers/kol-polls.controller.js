"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolPollsController", function ($scope, logger, kolPollService, utilityService, gaService, kolHistoryService, ngToast, profileManager, $translate, connectionService) {
            gaService.sendEvent('poll', 'open');
            $scope.cs = connectionService;
            $scope.kolPollService = kolPollService;
            $scope.translations = {
                "POLL.CONFIRMMODAL.TITLE": "",
                "POLL.CONFIRMMODAL.QUESTION": "",
                "POLL.CONFIRMMODAL.CONFIRMlABEL_DELETE": "",
                "POLL.CONFIRMMODAL.CONFIRMlABEL_CANCEL": "",
                "POLL.MODAL.NG_TOAST.POLL_RESULT_403_TOAST": "",
                "POLL.MODAL.NG_TOAST.POLL_RESULT_401_TOAST": "",
                "POLL.MODAL.NG_TOAST.POLL_RESULT_404_TOAST": "",
                "POLL.MODAL.NG_TOAST.POLL_RESULT_NOT_START": ""
            };
            const translationsRes = $translate.instant(Object.keys($scope.translations));
            for (let key in translationsRes) {
                if ({}.hasOwnProperty.call($scope.translations, key)) {
                    $scope.translations[key] = translationsRes[key];
                }
            }
            // 处理历史仍有效的polls
            let handleActivePolls = () => {
                logger.debug("handle active polls..");
                let kolPolls = kolPollService.kolPolls;
                kolPolls.forEach(poll => {
                    if (poll.is_active) {
                        let leftMsec = (poll.duration * 1000) - (new Date() - new Date(poll.started_at).getTime());
                        if (leftMsec > 0) {
                            setTimeout((kpoll) => {
                                kpoll.is_active = false;
                                kolPollService.saveKolPoll(kpoll);
                            }, leftMsec, poll);
                        }
                    }
                });
            };
            handleActivePolls();

            //获取对应的选项设置
            $scope.getPollOptionsStrings = function (kolPoll) {
                let res = kolPoll.choices.length > 0 ? kolPoll.choices.map(item => item.title).join(" | ") : "--";
                if (res.length > 35) {
                    res = res.substring(0, 35) + "...";
                }
                return res;
            };

            $scope.togglePollStatus = (kolPoll) => {
                // kolPoll.isActive = !kolPoll.isActive;
                //判断是否已经完成投票，如果已经完成，则不允许继续操作
                // if (kolPoll.twitchPoll && kolPoll.twitchPoll.status != 'ACTIVE') {
                //     ngToast.create("this poll is finished");
                //     return false;
                // }
                if (!kolPoll.is_active) {
                    kolPollService.beginKolPoll(kolPoll).then((data) => {
                        if (data.type === 'success') {
                            setTimeout(() => {
                                kolPoll.is_active = false;
                                kolPollService.saveKolPoll(kolPoll);
                            }, kolPoll.duration * 1000, kolPoll);
                            kolHistoryService.pushHistoryMsg(`Began a poll: ${kolPoll.title}`);
                        } else if (data.type === 'error') {
                            kolPoll.is_active = false;
                            if (data.data && data.data._body) {
                                if (data.data._statusCode === 403) {
                                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_403_TOAST']);
                                } else if (data.data._statusCode === 401) {
                                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_401_TOAST']);
                                } else if (data.data._statusCode === 404) {
                                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_404_TOAST']);
                                } else if (data.data._statusCode === 400) {
                                    ngToast.create(data.data._body.message);
                                }
                            }
                        }
                    });
                } else {
                    kolPollService.endKolPoll(kolPoll).then((data) => {
                        if (data.type === 'success') {
                            kolHistoryService.pushHistoryMsg(`Ended a poll: ${kolPoll.title}`);
                        } else if (data.type === 'error') {
                            kolPoll.is_active = false;
                            if (data.data && data.data._body) {
                                if (data.data._statusCode === 403) {
                                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_403_TOAST']);
                                } else if (data.data._statusCode === 401) {
                                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_401_TOAST']);
                                }
                                // else if (data.data._statusCode === 400) {
                                //     ngToast.create("poll must be active to be terminated");
                                // }
                            }
                        }
                    });
                }
            };

            $scope.openEditKolPollSettingsModal = function (kolPoll) {
                if ($scope.cs.accounts.streamer.loggedIn) {
                    if (kolPollService.isPartner) {
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
                                    kolPoll.twitchPoll = {};
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
                    } else {
                        ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_403_TOAST']);
                    }
                } else {
                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_403_TOAST']);
                }
            };

            $scope.viewKolPollResult = function (kolPoll) {
                if (kolPoll && kolPoll.twitchPoll && kolPoll.twitchPoll.id) {
                    $scope.kolPollService.viewKolPollResult = {};
                    utilityService.showModal({
                        component: "viewKolPollResultModal",
                        resolveObj: {
                            kolPoll: () => kolPoll
                        }
                    });
                } else {
                    ngToast.create($scope.translations['POLL.MODAL.NG_TOAST.POLL_RESULT_NOT_START']);
                }
            };

            //删除指定的投票
            $scope.delete = function (kolPoll) {
                if (kolPoll == null) return;
                utilityService
                    .showConfirmationModal({
                        title: $scope.translations['POLL.CONFIRMMODAL.TITLE'],
                        question: $scope.translations['POLL.CONFIRMMODAL.QUESTION'],
                        confirmLabel: $scope.translations['POLL.CONFIRMMODAL.CONFIRMlABEL_DELETE'],
                        cancelLabel: $scope.translations['POLL.CONFIRMMODAL.CONFIRMlABEL_CANCEL'],
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
