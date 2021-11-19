"use strict";

(function() {
    angular.module("twitcherbotApp").component("replaceVariableInfo", {
        bindings: {
            trigger: "<"
        },
        template: `
            <eos-collapsable-panel show-label="Show Text Variables" hide-label="Hide Text Variables">
                <div>
                                 
                </div>
            </eos-collapsable-panel>
            `,
        controller: function($rootScope) {
            let ctrl = this;
        }
    });
}());
