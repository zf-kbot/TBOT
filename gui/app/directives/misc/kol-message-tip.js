"use strict";

(function() {
    angular.module("twitcherbotApp")
        .component("kolMessageTip", {
            bindings: {
                commonText: "<",
                arguments: "<",
                appendToInput: "&"
            },
            template: `
                <span class="kol-message-tip">
                    {{$ctrl.commonText}}
                    <span ng-repeat="argument in $ctrl.arguments" ng-click="$ctrl.appendToInput({ name: argument })">
                        {{ argument }}<i class="fa fa-plus-circle purple"></i>
                    </span>
                </span>
            `
        });
}());
