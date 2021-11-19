"use strict";

(function () {
    angular.module("twitcherbotApp").component("aboutModal", {
        template: `
            <div class="modal-header" style="text-align: center;">
                <button type="button" class="close" ng-click="$ctrl.dismiss()"><span><i style="color: #9145ff;font-size: 30px" class="fas fa-times-circle"></i></span></button>
                <h4 class="modal-title">About Twitchbot</h4>
            </div>
            <div class="modal-body" style="text-align: center;">
                <h5><b>Version</b></h5>
                <p>{{$ctrl.version}}</p>

                <h5><b>Support</b></h5> 
                <span>Experiencing a problem or have a suggestion?</span></br>
                <p> Visit our webset.</p>

                <h5><b>Contributors</b></h5> 
                <div>
                    <div>zingfront</div>
                </div>
            </div>
            `,
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&"
        },
        controller: function () {
            let $ctrl = this;

            $ctrl.$onInit = function () {
                $ctrl.version = electron.remote.app.getVersion();
            };
        }
    });
}());
