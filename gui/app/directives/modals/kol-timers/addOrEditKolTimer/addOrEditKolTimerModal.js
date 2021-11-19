"use strict";

// Modal for adding or editting a command

(function () {
    angular.module("twitcherbotApp").component("addOrEditKolTimerModal", {
        templateUrl: "./directives/modals/kol-timers/addOrEditKolTimer/addOrEditKolTimerModal.html",
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&",
            modalInstance: "<"
        },
        controller: function ($scope, utilityService, ngToast, $timeout) {
            let $ctrl = this;

            //如果要创建对应的计时器，需要先创建对应的效果，并设置对应的队列，才可正常运行;

            $ctrl.kolTimer = {
                active: true, //计时器是否触发;
                start_time: null, //开始时间;
                end_time: null, //结束时间;
                onlyWhenLive: false, //是否只有在线时才触发；
                randomize: false,
                message: null, //回复消息;
                name: "", //计时器标题
                interval: 160, //间隔多少秒;
                requiredChatLines: 160, //间隔多少行;
                effects: [],
            };
            $ctrl.refreshSlider = function() {
                $timeout(function() {
                    $scope.$broadcast('rzSliderForceRender');
                });
            };
            $ctrl.$onInit = function () {
                if ($ctrl.resolve.kolTimer == null) {
                    $ctrl.isNewTimer = true;
                } else {
                    $ctrl.kolTimer = JSON.parse(JSON.stringify($ctrl.resolve.kolTimer));
                }
                $ctrl.refreshSlider();

                let modalId = $ctrl.resolve.modalId;
                $ctrl.modalId = modalId;
                utilityService.addSlidingModal(
                    $ctrl.modalInstance.rendered.then(() => {
                        let modalElement = $("." + modalId).children();
                        return {
                            element: modalElement,
                            name: "Edit Timer",
                            id: modalId,
                            instance: $ctrl.modalInstance
                        };
                    })
                );

                $scope.$on("modal.closing", function () {
                    utilityService.removeSlidingModal();
                });
            };

            $ctrl.effectListUpdated = function (effects) {
                $ctrl.kolTimer.effects = effects;
            };

            $ctrl.delete = function () {
                if ($ctrl.kolTimer == null) return;
                $ctrl.close({ $value: { timer: $ctrl.kolTimer, action: "delete" } });
            };

            function validateTimer() {
                if ($ctrl.kolTimer.name === "") {
                    ngToast.create("Please provide a name for the Timer.");
                    return false;
                } else if ($ctrl.kolTimer.interval < 1) {
                    ngToast.create("Timer interval must be greater than 0.");
                    return false;
                }
                return true;
            }

            $ctrl.save = function () {
                if (!validateTimer()) return;

                let action = $ctrl.isNewTimer ? "add" : "update";
                $ctrl.close({
                    $value: {
                        kolTimer: $ctrl.kolTimer,
                        action: action
                    }
                });
            };
        }
    });
}());
