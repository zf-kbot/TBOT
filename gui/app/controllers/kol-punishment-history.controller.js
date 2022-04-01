"use strict";
(function() {
    angular
        .module("twitcherbotApp")
        .controller("kolPunishmentHistoryController", function(
            $scope,
            gaService,
            utilityService,
            punishmentHistoryService
        ) {
            $scope.headers = [
                {
                    headerStyles: {
                        'width': '50px'
                    },
                    sortable: false,
                    cellTemplate: `<img ng-src="{{data.profilePicUrl}}"  style="width: 25px;height: 25px;border-radius: 25px;"/>`,
                    cellController: () => {}
                },
                {
                    name: "USERNAME",
                    icon: "fa-user",
                    dataField: "username",
                    headerStyles: {
                        'min-width': '125px'
                    },
                    sortable: true,
                    cellTemplate: `{{data.displayName || data.username}}`,
                    cellController: () => {}
                },
                {
                    name: "MESSAGE",
                    icon: "fa-eye",
                    dataField: "message",
                    sortable: true,
                    cellTemplate: `{{ data.message }}`,
                    cellController: () => {}
                },
                {
                    name: "PHRASE",
                    icon: "fa-eye",
                    dataField: "phrase",
                    sortable: true,
                    cellTemplate: `<span style="width: 160px; display: inline-block">{{ data.phrase }}</span>`,
                    cellController: () => {}
                },
                {
                    name: "PUNISHMENT",
                    icon: "fa-eye",
                    dataField: "punishment",
                    sortable: true,
                    cellTemplate: `<span style="width: 80px; display: inline-block">{{ data.punishment }}</span>`,
                    cellController: () => {}
                },
                {
                    name: "DATE",
                    icon: "fa-eye",
                    dataField: "createdAt",
                    sortable: true,
                    cellTemplate: `{{data.createdAt | prettyDate}}`,
                    cellController: () => {}
                }
            ];
            $scope.createdAt = "createdAt";
            $scope.viewerRowClicked = (data) => {
                $scope.showUserDetailsModal(data._id);
            };
            $scope.ps = punishmentHistoryService;
            punishmentHistoryService.updateViewers();

            $scope.viewerRowClicked = (data) => {
                $scope.showUserDetailsModal(data.userId);
            };

            $scope.showUserDetailsModal = (userId) => {
                let closeFunc = () => {
                    punishmentHistoryService.updateViewers();
                };
                utilityService.showModal({
                    component: "viewerDetailsModal",
                    backdrop: true,
                    resolveObj: {
                        userId: () => userId
                    },
                    closeCallback: closeFunc,
                    dismissCallback: closeFunc
                });
            };
            gaService.sendEvent('punishment_history', 'open');

        });
}());
