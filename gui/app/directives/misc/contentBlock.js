"use strict";

(function() {
    angular.module("twitcherbotApp").component("contentBlock", {
        transclude: {
            header: "?contentHeader"
        },
        template: `
            <div class="content-block">
                <div class="content-block-header" ng-transclude="header"></div>
                <div class="content-block-body" ng-transclude></div>
            </div>
            `
    });
}());
