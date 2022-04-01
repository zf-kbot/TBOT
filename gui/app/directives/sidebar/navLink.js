"use strict";

(function() {
    angular.module("twitcherbotApp").component("navLink", {
        bindings: {
            name: "@",
            page: "@",
            icon: "@",
            isIndex: "<",
            badgeText: "<"
        },
        template: `
            <a draggable=false class="fb-nav-link" href="{{$ctrl.href}}" ng-class="{'selected': $ctrl.sbm.tabIsSelected($ctrl.page)}" ng-click="$ctrl.sbm.setTab($ctrl.page)"  uib-tooltip="{{!$ctrl.sbm.navExpanded ? $ctrl.name : ''}}" tooltip-placement="right" tooltip-append-to-body="true">
                <div class="nav-link-bar"></div>
                <div class="nav-link-icon">
                    <span class="nav-icon-wrapper">
                        <i ng-class="$ctrl.getClass()"></i>
                    </span>
                </div>
                <div class="nav-link-title" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">{{$ctrl.name}}
                    <span ng-if="$ctrl.name === 'Punishment History' || $ctrl.name === 'El Castigo Historia'"
                        style="color: #9145ff; font-style: italic; border: 1px solid; border-radius: 5px; font-size: 7px; position: absolute;"
                    >
                        New
                    </span>
                </div>
                <div ng-show="$ctrl.hasBadge" class="nav-update-badge" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">
                    <span class="label label-danger">{{$ctrl.badgeText}}</span>
                </div>
            </a>
            `,
        controller: function(sidebarManager) {
            let ctrl = this;

            ctrl.sbm = sidebarManager;

            ctrl.$onInit = function() {
                ctrl.hasBadge = ctrl.badgeText != null && ctrl.badgeText !== "";
                ctrl.href = ctrl.isIndex
                    ? "#"
                    : "#!" + ctrl.page.toLowerCase().replace(/\W/g, "-");
            };

            ctrl.getClass = function() {
                let isSelected = sidebarManager.tabIsSelected(ctrl.page);
                return `${isSelected ? "fa" : "fa"} ${ctrl.icon}`;
            };
        }
    });
}());
