"use strict";

(function () {
    angular.module("twitcherbotApp").component("settingModal", {
        template: `
            <div class="modal-header" style="text-align: center;">
                <button type="button" class="close" ng-click="$ctrl.dismiss()"><span><i style="color: #9145ff;font-size: 30px" class="fa fa-times-circle"></i></span></button>
                <h4 class="modal-title">Quit Setting</h4>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div class="controls-fb-inline">
                    <label class="control-fb control--radio" style="display:flex;">Minimize to the system tray
                        <input type="radio" ng-model="$ctrl.getQuitSetting.isMinimized" ng-value= "true" ></input>
                        <div class="control__indicator"></div>
                    </label>
                    <label class="control-fb control--radio" style="display:flex;">Quit Twitchbot
                        <input type="radio" ng-model="$ctrl.getQuitSetting.isMinimized" ng-value= "false" ></input>
                        <div class="control__indicator"></div>
                    </label>

                    <label class="control-fb control--checkbox" style="display:flex;margin-top:36px;">Don't ask again next time
                        <input type="checkbox" ng-model="$ctrl.getQuitSetting.noNeedAsk"/>
                        <div class="control__indicator"></div>
                    </label>
                    
                </div>
            </div>
            <div class="modal-footer sticky-footer edit-command-footer">
                <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">
                    Cancel
                </button>
                <button
                    type="button"
                    class="btn btn-primary add-new-board-save"
                    ng-click="$ctrl.save()"
                >
                    Save
                </button>
            </div>
            `,
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&"
        },
        controller: function (profileManager, gaService) {
            let $ctrl = this;
            function getQuitSetting() {
                return profileManager.getJsonDbInProfile('/settings');
            }
            function getQuitSettingMsgs(path) {
                try {
                    let data = getQuitSetting().getData(path);
                    return data ? data : {};
                } catch (err) {
                    return {};
                }
            }
            function pushQuitSettingToFile(path, data) {
                try {
                    getQuitSetting().push(path, data, true);
                } catch (err) {} //eslint-disable-line no-empty
            }
            function saveQuitSettingMsg(path, msg) {
                pushQuitSettingToFile(path, msg);
            }
            $ctrl.getQuitSetting = getQuitSettingMsgs("/quitsetting");
            $ctrl.$onInit = function () {
                $ctrl.getQuitSetting = getQuitSettingMsgs("/quitsetting");
                if (!("isMinimized" in $ctrl.getQuitSetting)) {
                    //$ctrl.getQuitSetting.isMinimized is boolean.
                    $ctrl.getQuitSetting.isMinimized = true;
                    $ctrl.getQuitSetting.noNeedAsk = true;
                }
            };
            $ctrl.save = function() {
                saveQuitSettingMsg("/quitsetting", $ctrl.getQuitSetting);
                let action = "";
                if ($ctrl.getQuitSetting.isMinimized) {
                    gaService.sendEvent('quitSetting', 'click', 'minimize');
                    action = "minimize";
                } else {
                    gaService.sendEvent('quitSetting', 'click', 'quit');
                    action = "quit";
                }
                $ctrl.close({
                    $value: {
                        quitSetting: $ctrl.getQuitSetting,
                        action: action
                    }
                });
            };
        }
    });
}());
