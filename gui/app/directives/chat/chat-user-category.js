"use strict";
(function() {
    angular
        .module('twitcherbotApp')
        .component("chatUserCategory", {
            bindings: {
                category: "@",
                roleKey: "@"
            },
            template: `
            <div 
                ng-show="filtered != null && filtered.length > 0" 
                style="margin-bottom:15px;"
            >
                <div style="font-size: 12px; opacity: 0.6;">{{ 'DASHBOARD.CHATUSERS.' + $ctrl.category | translate}}
                    <span
                        ng-if= "$ctrl.category == 'Viewers'"
                        uib-tooltip="{{cms.viewerFollowers.length}} followers, {{cms.viewerUnfollowers.length}} unfollowers"
                    > - {{cms.viewers.length}}
                        <i class="fa fa-heart" aria-hidden="true">{{cms.viewerFollowers.length}}</i>
                        <i class="fa fa-heart-o" aria-hidden="true">{{cms.viewerUnfollowers.length}}</i>
                    </span>
                </div>
                <div
                    class="chat-user-wrapper"
                    ng-repeat="user in cms.chatUsers | chatUserRole:$ctrl.roleKey | orderBy:'username':true | orderBy:'active':true as filtered track by user.id"
                >
                    <div class="chat-user-img-wrapper">
                        <img ng-src="{{user.profilePicUrl}}" />
                        <span
                            class="chat-user-status"
                            ng-class="{ active: user.active }"
                            uib-tooltip="{{user.active ? 'Active chat user' : 'Inactive chat user (Lurking)'}}"
                            tooltip-append-to-body="true"
                        ></span>
                        </div>
                    <div
                        class="chat-user-name clickable"
                        ng-click="showUserDetailsModal(user.id)"
                        >
                        {{user.username}}
                    </div>
                </div>
            </div>
            `,
            controller: function($scope, chatMessagesService, utilityService) {

                $scope.cms = chatMessagesService;
                let viewerLength = $scope.cms.chatUsers.filter(u =>
                    !u.roles.includes("broadcaster") && !u.roles.includes("mod") && !u.roles.includes("vip") && !u.roles.includes("bot")
                ).length;
                $scope.countViewers = viewerLength;
                $scope.countFollower = viewerLength;
                $scope.countUnfollower = viewerLength;

                $scope.showUserDetailsModal = (userId) => {
                    if (userId == null) return;
                    const closeFunc = () => {};
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
            }
        });
}());
