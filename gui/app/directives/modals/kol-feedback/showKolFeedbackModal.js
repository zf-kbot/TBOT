"use strict";

(function () {

    const { clipboard } = require('electron');

    angular.module("twitcherbotApp").component("showKolFeedbackModal", {
        template: `
            <div class="modal-header">
                <button type="button" class="close" aria-label="Close" ng-click="$ctrl.dismiss()"><span aria-hidden="true"><i style="color: #9145ff;font-size: 30px" class="fas fa-times-circle"></i></span></button>
                <h4 class="modal-title" id="errorLabel">Feedback</h4>
            </div>
            <div class="modal-body">
                <p>Thank you for choosing Twitchbot to enjoy your live tour. Inviting you to participate in a  survey,we will take your feedback seriously.</p>
                <p>Will you fill in the questionnaire? Thank you for your reading and help.</p>
                <div ng-show="$ctrl.showRedirectInfo">
                    <br/>
                    <p>*If the page cannot be redirected after you click OK button, copy the URL to open the link:
                        <a id="feedbackUrl" href="javascript:void(0);">https://forms.gle/GticfN43FL5hLDj29</a> <i ng-class="$ctrl.clickedCopyBtn ? 'fas fa-copy' : 'far fa-copy'" ng-click="$ctrl.copy()" style="font-size: 18px" tooltip-trigger="'click'" uib-tooltip="Copied"></i>
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">Later</button>
                <button type="button" class="btn btn-primary" ng-click="$ctrl.submit()">OK</button>
            </div>
        `,
        bindings: {
            modalInstance: "<"
        },
        controller: function ($scope, profileManager, gaService) {
            gaService.sendEvent('feedback', 'open');
            profileManager.getJsonDbInProfile('/feedbackInfo').push('/latestPopupTime', new Date().getTime(), true);
            let $ctrl = this;
            $ctrl.clickedCopyBtn = false;
            $ctrl.showRedirectInfo = false;

            let url = '';
            $ctrl.submit = function () {
                $ctrl.showRedirectInfo = true;
                url = angular.element("#feedbackUrl").text();
                shell.openExternal(url);
                profileManager.getJsonDbInProfile('/feedbackInfo').push('/isParticipate', true, true);
                gaService.sendEvent('feedback', 'click', 'ok');
            };

            $ctrl.close = function () {
                $ctrl.modalInstance.close();
            };

            $ctrl.dismiss = function () {
                $ctrl.modalInstance.dismiss("cancel");
            };

            $ctrl.copy = function () {
                $ctrl.clickedCopyBtn = true;
                clipboard.writeText(url);
            };
        }
    });
}());