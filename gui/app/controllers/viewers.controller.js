"use strict";

(function() {

    angular
        .module("twitcherbotApp")
        .controller("viewersController", function($scope, viewersService, currencyService,
            utilityService, settingsService, gaService) {
            gaService.sendEvent('leadership', 'open');
            $scope.viewerTablePageSize = settingsService.getViewerListPageSize();

            $scope.showUserDetailsModal = (userId) => {
                let closeFunc = () => {
                    viewersService.updateViewers();
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

            $scope.viewerRowClicked = (data) => {
                $scope.showUserDetailsModal(data._id);
            };

            $scope.showViewerSearchModal = () => {
                utilityService.openViewerSearchModal(
                    {
                        label: "Viewer Search",
                        saveText: "Select"
                    },
                    (user) => {
                        $scope.showUserDetailsModal(user.id);
                    });
            };

            $scope.vs = viewersService;

            // Update table rows when first visiting the page.
            if (viewersService.isViewerDbOn()) {
                viewersService.updateViewers();
            }

            $scope.viewerSearch = "";

            $scope.headers = [
                {
                    headerStyles: {
                        'width': '50px'
                    },
                    sortable: false,
                    cellTemplate: `<img ng-src="{{data.twitch ? data.profilePicUrl : '../images/placeholders/mixer-icon.png'}}"  style="width: 25px;height: 25px;border-radius: 25px;"/>`,
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
                    name: "LV",
                    icon: "fa-eye",
                    dataField: "userLV",
                    sortable: true,
                    cellTemplate: `<span style="border: 1px solid #EAA348;background: white;color: #EAA348;font-size: 14px;border-radius: 5px;width: 70px;text-align: left;padding-left: 13px;margin-right: 20px;vertical-align: middle;display: inline-block;">LV {{ data.userLV }}</span>`,
                    cellController: () => {}
                },
                {
                    name: "XP",
                    icon: "fa-eye",
                    dataField: "totalXP",
                    sortable: true,
                    cellTemplate: `<span style="width: 80px; display: inline-block">{{ data.totalXP }}</span>`,
                    cellController: () => {}
                },
                {
                    name: "ROLES",
                    icon: "fa-eye",
                    dataField: "twitchRoles",
                    sortable: true,
                    cellTemplate: `<span ng-repeat="role in data.twitchRoles"
                        style="display: inline-block;margin-right: 10px;width: 70px;border-radius: 5px;line-height: 22px;text-align: center;"
                        ng-style="{'background': setRoleBgColor(role)}"
                    >{{ role }}</span>`,
                    cellController: ($scope) => {
                        $scope.setRoleBgColor = (roleName) => {
                            switch (roleName) {
                            case "vip":
                                return "#E3760E";
                            case "mod":
                                return "#8849F6";
                            case "subscriber":
                                return "#0AA26F";
                            case "regular":
                                return "#5A9CF8";
                            }
                        };
                    }
                },
                {
                    name: "LAST SEEN",
                    icon: "fa-eye",
                    dataField: "lastSeen",
                    sortable: true,
                    cellTemplate: `{{data.lastSeen | prettyDate}}`,
                    cellController: () => {}
                }
            ];

            $scope.currencies = currencyService.getCurrencies();

            for (let currency of $scope.currencies) {
                $scope.headers.push({
                    name: currency.name.toUpperCase(),
                    icon: "fa-money-bill",
                    dataField: "currency." + currency.id,
                    sortable: true,
                    cellTemplate: `{{data.currency['${currency.id}']}}`,
                    cellController: () => {}
                });
            }

            $scope.headers.push({
                headerStyles: {
                    'width': '15px'
                },
                cellStyles: {
                    'width': '15px'
                },
                sortable: false,
                cellTemplate: `<i class="fa fa-chevron-right"></i>`,
                cellController: () => {}
            });

            $scope.roleSelected = ["All"];
            $scope.roleIsChecked = (roleName) => {
                return $scope.roleSelected.includes(roleName);
            };
            $scope.roleIsCheckedStyle = (roleName) => {
                return $scope.roleIsChecked(roleName) ? 'clickable fa fa-check-square' : 'clickable fa fa-square';
            };
            $scope.candidateRoles = ["All", "Vip", "Mod", "Subscriber", "Regular"];
            $scope.clickRolesOption = (roleName) => {
                if ($scope.roleIsChecked(roleName)) {
                    let idx = $scope.roleSelected.indexOf(roleName);
                    $scope.roleSelected.splice(idx, 1);
                    if ($scope.roleSelected.length <= 0) {
                        $scope.roleSelected.push("All");
                        $scope.roleSelected = $scope.roleSelected.slice();
                    }
                } else {
                    $scope.roleSelected.push(roleName);
                    $scope.roleSelected = $scope.roleSelected.slice();
                }
            };

            $scope.minLv = '';
            $scope.maxLv = '';

            $scope.filterDataFunc = function () {
                return (user) => {
                    // 非all角色，且用户没有选择的角色
                    if ((!$scope.roleSelected.includes("All")
                            && $scope.roleSelected.filter(x => user.twitchRoles.includes(x.toLowerCase())).length === 0)
                        // 或是用户等级不符合则过滤
                        || $scope.minLv.length !== 0 && !isNaN(parseInt($scope.minLv)) && user.userLV < $scope.minLv
                        || $scope.maxLv.length !== 0 && !isNaN(parseInt($scope.maxLv)) && user.userLV > $scope.maxLv) {
                        return false;
                    }
                    return true;
                };
            };
        });
}());
