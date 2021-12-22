"use strict";

// Modal for adding or editting a command

(function () {
    angular.module("twitcherbotApp").component("viewKolPollResultModal", {
        templateUrl: "./directives/modals/kol-poll/kolPollResult/viewKolPollResultModal.html",
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&",
            modalInstance: "<"
        },
        controller: function ($scope, utilityService, kolPollService, backendCommunicator, logger) {
            let $ctrl = this;
            $ctrl.kolPollService = kolPollService;

            $ctrl.loading = false;
            // $ctrl.viewKolPollResult = {};

            // backendCommunicator.on("get-twitch-poll-result", (data) => {
            //     console.info(data);
            // });

            $ctrl.getVoteTotal = function (viewKolPollResult) {
                let sum = 0;
                viewKolPollResult.choices.map(item => {
                    sum += item.votes;
                });
                return sum;
            }

            $ctrl.getItemVoteRate = function (choice, viewKolPollResult) {
                let sum = $ctrl.getVoteTotal(viewKolPollResult);
                if (sum > 0) {
                    return (choice.votes / sum).toFixed(2) * 100;
                } else {
                    return "-"
                }
            }

            $ctrl.$onInit = function () {
                if ($ctrl.resolve.kolPoll == null) {
                    return;
                }

                $ctrl.intervalViewResult = setInterval((kolPoll)=> {
                    logger.info(kolPoll.twitchPoll.id);
                    $ctrl.getKolPollResult(kolPoll);
                    if ($ctrl.kolPollService.viewKolPollResult.status === "COMPLETED" || $ctrl.kolPollService.viewKolPollResult.status === "ARCHIVED" || $ctrl.kolPollService.viewKolPollResult.status === "TERMINATED") {
                        clearInterval($ctrl.intervalViewResult);
                    }
                    $ctrl.loading = true;
                }, 1000, $ctrl.resolve.kolPoll);
                // $ctrl.getKolPollResult($ctrl.resolve.kolPoll);

                let modalId = $ctrl.resolve.modalId;
                $ctrl.modalId = modalId;
                utilityService.addSlidingModal(
                    $ctrl.modalInstance.rendered.then(() => {
                        let modalElement = $("." + modalId).children();
                        return {
                            element: modalElement,
                            name: "Total Votes",
                            id: modalId,
                            instance: $ctrl.modalInstance
                        };
                    })
                );

                $scope.$on("modal.closing", function () {
                    clearInterval($ctrl.intervalViewResult);
                    utilityService.removeSlidingModal();
                });
            };
            // $ctrl.getKolPollResult = setInterval((kolPoll) => {
            //     $ctrl.kolPollService.getKolPollResult(kolPoll.twitchPoll.id);
            // }, 1000);
            $ctrl.getKolPollResult = function (kolPoll) {
                $ctrl.kolPollService.getKolPollResult(kolPoll.twitchPoll.id);
            }
        }
    });
}());
