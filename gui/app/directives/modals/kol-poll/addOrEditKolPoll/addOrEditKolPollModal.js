"use strict";

// Modal for adding or editting a command

(function () {
    angular.module("twitcherbotApp").component("addOrEditKolPollModal", {
        templateUrl: "./directives/modals/kol-poll/addOrEditKolPoll/addOrEditKolPollModal.html",
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&",
            modalInstance: "<"
        },
        controller: function ($scope, $translate, logger, utilityService, ngToast) {
            let $ctrl = this;

            $ctrl.kolPoll = {
                is_active: false, //是否激活
                duration: 15, //投票持续时间,最小15秒，最大持续1800秒；
                title: "", //投票名称
                //选项，至少有2个选项，最多五个选项，基于twitch规则
                choices: [{
                    title: "",
                }, {
                    title: "",
                }],
                bits_voting_enabled: false,
                bits_per_vote: null,
                channel_points_voting_enabled: false,
                channel_points_per_vote: null
            };

            //新增一个投票选项
            $ctrl.addNewPollOption = function () {
                $ctrl.kolPoll.choices.push({
                    title: "",
                });
            };

            //移除指定的投票选项
            $ctrl.removeOption = function (index) {
                //只有至少2个投票选项才允许删除
                if ($ctrl.kolPoll.choices.length > 2) {
                    $ctrl.kolPoll.choices.splice(index, 1);
                }
            };

            $ctrl.$onInit = function () {
                if ($ctrl.resolve.kolPoll == null) {
                    $ctrl.isNewKolPoll = true;
                } else {
                    $ctrl.kolPoll = JSON.parse(JSON.stringify($ctrl.resolve.kolPoll));
                }

                $ctrl.translations = {
                    "POLL.MODAL.BODY.NAME_PLACEHOLDER": "",
                    "POLL.MODAL.BODY.NAME_TOOLTIP": "",
                    "POLL.MODAL.BODY.DURATION_PLACEHOLDER": "",
                    "POLL.MODAL.BODY.DURATION_TOOLTIP": "",
                    "POLL.MODAL.BODY.OPTIONS_PLACEHOLDER_PREFIX": "",
                    "POLL.MODAL.BODY.OPTIONS_PLACEHOLDER_SUFFIX": "",
                    "POLL.MODAL.BODY.OPTIONS_TOOLTIP": "",
                    "POLL.MODAL.BODY.BITS_PER_VOTE_TOOLTIP": "",
                    "POLL.MODAL.BODY.BITS_PER_VOTE_PLACEHOLDER": "",
                    "POLL.MODAL.BODY.CHANNEL_POINTS_PER_VOTE_TOOLTIP": "",
                    "POLL.MODAL.BODY.CHANNEL_POINTS_PER_VOTE_PLACEHOLDER": "",
                    "POLL.MODAL.NG_TOAST.POLL_TITLE_NAME_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_TITLE_NAME_LENGTH_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_CHOICES_OPTION_LENGTH_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_CHOICES_VALUE_NOT_NULL_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_CHOICES_VALUE_LENGTH_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_BITS_PER_VOTE_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_CHANNEL_POINTS_PER_VOTE_TOAST": "",
                    "POLL.MODAL.NG_TOAST.POLL_DURATION_TIME_TOAST": ""
                };
                const translationRes = $translate.instant(Object.keys($ctrl.translations));
                for (let key in $ctrl.translations) {
                    if ({}.hasOwnProperty.call($ctrl.translations, key)) {
                        $ctrl.translations[key] = translationRes[key];
                    }
                }

                let modalId = $ctrl.resolve.modalId;
                $ctrl.modalId = modalId;
                utilityService.addSlidingModal(
                    $ctrl.modalInstance.rendered.then(() => {
                        let modalElement = $("." + modalId).children();
                        return {
                            element: modalElement,
                            name: "Edit Poll",
                            id: modalId,
                            instance: $ctrl.modalInstance
                        };
                    })
                );

                $scope.$on("modal.closing", function () {
                    utilityService.removeSlidingModal();
                });
            };

            function validateKolPoll() {
                if ($ctrl.kolPoll.title === "") {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_TITLE_NAME_TOAST']);
                    return false;
                } else if ($ctrl.kolPoll.title.length > 60) {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_TITLE_NAME_LENGTH_TOAST']);
                    return false;
                }
                if ($ctrl.kolPoll.choices.length === 0) {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_CHOICES_OPTION_LENGTH_TOAST']);
                    return false;
                } else if ($ctrl.kolPoll.choices.length > 0) {
                    if ($ctrl.kolPoll.choices.filter(item => !item.title).length > 0) {
                        ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_CHOICES_VALUE_NOT_NULL_TOAST']);
                        return false;
                    }
                    if ($ctrl.kolPoll.choices.filter(item => item.title.length > 25).length > 0) {
                        ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_CHOICES_VALUE_LENGTH_TOAST']);
                        return false;
                    }
                }
                if ($ctrl.kolPoll.duration < 15 || $ctrl.kolPoll.duration > 1800) {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_DURATION_TIME_TOAST']);
                    return false;
                }
                if ($ctrl.kolPoll.bits_voting_enabled && ($ctrl.kolPoll.bits_per_vote < 1 || $ctrl.kolPoll.bits_per_vote > 9999)) {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_BITS_PER_VOTE_TOAST']);
                    return false;
                }
                if ($ctrl.kolPoll.channel_points_voting_enabled && ($ctrl.kolPoll.channel_points_per_vote < 1 || $ctrl.kolPoll.channel_points_per_vote > 999999)) {
                    ngToast.create($ctrl.translations['POLL.MODAL.NG_TOAST.POLL_CHANNEL_POINTS_PER_VOTE_TOAST']);
                    return false;
                }
                return true;
            }

            $ctrl.save = function () {
                if (!validateKolPoll()) return;

                let action = $ctrl.isNewKolPoll ? "add" : "update";
                $ctrl.close({
                    $value: {
                        kolPoll: $ctrl.kolPoll,
                        action: action
                    }
                });
            };
        }
    });
}());
