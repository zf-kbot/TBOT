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
        controller: function ($scope, utilityService, ngToast) {
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
                }]
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
            }

            $ctrl.$onInit = function () {
                if ($ctrl.resolve.kolPoll == null) {
                    $ctrl.isNewKolPoll = true;
                } else {
                    $ctrl.kolPoll = JSON.parse(JSON.stringify($ctrl.resolve.kolPoll));
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
                    ngToast.create("Please provide a name for the Poll.");
                    return false;
                } else if ($ctrl.kolPoll.title.length > 60) {
                    ngToast.create("The maximum character length of the title cannot exceed 60");
                    return false;
                };
                if ($ctrl.kolPoll.choices.length == 0) {
                    ngToast.create("Poll must have more then one option.");
                    return false;
                } else if ($ctrl.kolPoll.choices.length > 0) {
                    if ($ctrl.kolPoll.choices.filter(item => !item.title).length > 0) {
                        ngToast.create("Option must have a value");
                        return false;
                    }
                    if ($ctrl.kolPoll.choices.filter(item => item.title.length > 25).length > 0) {
                        ngToast.create("The maximum character length of the option cannot exceed 25");
                        return false;
                    }
                }
                if ($ctrl.kolPoll.duration < 15 || $ctrl.kolPoll.duration > 1800) {
                    ngToast.create("The voting duration must be between 15 seconds and 1800 seconds");
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
