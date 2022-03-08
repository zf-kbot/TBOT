"use strict";

(function () {
    angular.module("twitcherbotApp").component("loyalSettingResetConfirmModal", {
        template: `
        <div class="modal-header" style="text-align: center;">
        <h4 class="modal-title">{{ "LOYAL_SETTING_RESET_CONFIRM_MODAL.TITTLE" | translate}}</h4>
        </div>
        <div class="modal-body" style="text-align: center;">
            <div class="controls-fb-inline">
                <span>{{ "LOYAL_SETTING_RESET_CONFIRM_MODAL.CONTENT" | translate}}</span></br>
            </div>
        </div>
        <div class="modal-footer sticky-footer edit-command-footer">
            <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">
                {{ "CANCEL" | translate}}
            </button>
            <button
                type="button"
                class="btn btn-primary add-new-board-save"
                ng-click="$ctrl.save()"
            >
                {{ "LOYAL_SETTING_RESET_CONFIRM_MODAL.CONFIRM" | translate}}
            </button>
        </div>
            `,
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&"
        },
        controller: function () {
            let $ctrl = this;
            $ctrl.save = function() {
                let action = "confirm";
                $ctrl.close({
                    $value: {
                        action: action
                    }
                });
            };

        }
    });
}());
