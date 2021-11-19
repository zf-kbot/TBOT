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
        controller: function ($scope, utilityService, kolPollService, backendCommunicator) {
            let $ctrl = this;
            $ctrl.kolPollService = kolPollService;

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
                    return (choice.votes / sum).toFixed(2);
                } else {
                    return "-"
                }
            }

            $ctrl.$onInit = function () {
                if ($ctrl.resolve.kolPoll == null) {
                    return;
                } else {
                    $ctrl.getKolPollResult($ctrl.resolve.kolPoll);
                }

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
                    utilityService.removeSlidingModal();
                });
            };

            $ctrl.getKolPollResult = function (kolPoll) {
                $ctrl.kolPollService.getKolPollResult(kolPoll.twitchPoll.id);
            }
        }
    });
}());
