"use strict";

(function() {
    angular.module("twitcherbotApp")
        .component("kolPopChatEmotesModal", {
            template: `
            <!-- <kol-emotebar class="noselect"></kol-emotebar> -->
            <div>
                <div style="display:flex ;flex-direction:row" >
                    <div style= "display:flex;flex-direction:column;background:transparent;">
                        <div class="modalsidebar">
                            <div class="nav-link-bar" ng-if="$ctrl.clickName == 'Regular'" ></div>
                            <div class="nav-link-bar" style="background-color:transparent;" ng-if="$ctrl.clickName != 'Regular'" ></div>
                            <button class="settings-btn" ng-click="$ctrl.clickFrequentlyUsed()" aria-label="Chat Settings" style="height:35px;">
                                <i class="fa fa-clock-o" title = "Regular"></i>
                            </button>
                        </div>
                        <div class="modalsidebar">
                            <div class="nav-link-bar" ng-if="$ctrl.clickName == 'Global'"></div>
                            <div class="nav-link-bar" style="background-color:transparent;" ng-if="$ctrl.clickName != 'Global'" ></div>
                            <button class="settings-btn" ng-click="$ctrl.clickGlobal()" aria-label="Chat Settings" style="height:35px;">
                                <i class="fa fa-globe" title = "Global"></i>
                            </button>
                        </div>
                    </div>
                    <div style="width:100%;height:335px;">
                        <div style="height:35px;">
                            <span style= "display:inline-block;margin-top:5px;padding-left:10px;font-size:18px;">{{$ctrl.clickName}}</span>
                            <button type="button" class="close" aria-label="Close" ng-click="$ctrl.dismiss()" >
                                <span aria-hidden="true"><i style="font-size:22px;font-weight:200;margin-right:10px;margin-top:5px;" class="fa fa-times"></i></span>
                            </button>
                        </div>
                        <span ng-if="!chatFeedIsEnabled" style="display:inline-block; color: white; font-size: 1.2em; text-align: center; padding-left:5px;margin-top:30%;" class="ng-binding" >
                            The Emote will accessable when Twitchbot is connected.
                        </span>
                        <div ng-show="chatFeedIsEnabled" style="width:100%;height:300px;overflow:auto;padding-left:5px;">
                            <span ng-repeat="chatEmote in $ctrl.chatMessageAllemotes track by $index" style="display:inline-block;width:40px;height:40px" ng-if= "$ctrl.chatMessageAllemotes.length != 0">
                                <img class="button" src={{chatEmote.url}} ng-click = "$ctrl.addChatMessage(chatEmote)" title = "{{chatEmote.code}}">
                            </span>
                            <span ng-if= "$ctrl.chatMessageAllemotes.length == 0 && $ctrl.clickName == 'Global'" style="display:inline-block; color: white; font-size: 1.2em; text-align: center; padding-left:5px;width:100%;margin-top:30%;">
                                emote is loading... 
                            </span>
                            <div ng-if= "$ctrl.chatMessageAllemotes.length == 0 && $ctrl.clickName == 'Regular'" class="kol-none-box" style="width:300px;height: 280px;background: #24262A;margin-left:8px;">
                                <p style="font-size: 20px;">NONE</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `,
            bindings: {
                resolve: "<",
                close: "&",
                dismiss: "&"
            },
            controller: function($scope, $rootScope, $timeout, settingsService, chatMessagesService, profileManager, logger) {
                const $ctrl = this;
                $scope.chatFeedIsEnabled = true;
                $ctrl.cms = chatMessagesService;
                $ctrl.clickName = "Global";

                $ctrl.chatMessageAllemotes = chatMessagesService.getAllEmotes();

                $scope.customFontSize = settingsService.getChatCustomFontSize();

                $ctrl.getEmoteFile = function getEmoteFile() {
                    return profileManager.getJsonDbInProfile('/emote');
                };

                $ctrl.pushDataToFile = function pushDataToFile(path, data) {
                    try {
                        $ctrl.getEmoteFile().push(path, data, true);
                    } catch (err) { } //eslint-disable-line no-empty
                };

                // 保存到本地
                $ctrl.saveEmoteMsg = function saveEmoteMsg(path, msg) {
                    $ctrl.pushDataToFile(path, msg);
                };

                // 保存到本地
                $ctrl.getEmoteMsgs = function getEmoteMsgs(path) {
                    try {
                        let data = $ctrl.getEmoteFile().getData(path);
                        return data ? data : [];
                    } catch (err) {
                        return [];
                    }
                };
                $ctrl.compare = function compare(property) {
                    return function (obj1, obj2) {
                        let value1 = obj1[property];
                        let value2 = obj2[property];
                        return value2 - value1; //desc
                    };
                };

                $ctrl.frequentlyUsed = $ctrl.getEmoteMsgs("/emote");

                $ctrl.addChatMessage = function(emote) {
                    $rootScope.$broadcast("clickEmoji", emote);

                    let msg = $ctrl.getEmoteMsgs(`/emote`);
                    let emoteIn = false;
                    if (!msg.length) {
                        let emoteMsg = emote;
                        emoteMsg.count = 1;
                        msg.push(emoteMsg);
                        $ctrl.saveEmoteMsg(`/emote`, msg);
                        return true;
                    }
                    msg.forEach(element => {
                        if (element.code === emote.code) {
                            element.count += 1;
                            emoteIn = true;
                        }
                    });
                    //emote not exist in emote.json
                    if (!emoteIn) {
                        let emoteMsg = emote;
                        emoteMsg.count = 1;
                        msg.push(emoteMsg);
                    }
                    let sortmsg = msg.sort($ctrl.compare("count"));
                    $ctrl.saveEmoteMsg(`/emote`, sortmsg);

                    // $ctrl.close();
                };

                $ctrl.clickGlobal = function () {
                    $ctrl.chatMessageAllemotes = chatMessagesService.getAllEmotes();
                    $ctrl.clickName = "Global";
                };

                $ctrl.clickFrequentlyUsed = function () {
                    $ctrl.frequentlyUsed = $ctrl.getEmoteMsgs("/emote");
                    if ($ctrl.frequentlyUsed.length > 25) {
                        $ctrl.frequentlyUsed = $ctrl.frequentlyUsed.slice(0, 25);
                    }
                    $ctrl.chatMessageAllemotes = $ctrl.frequentlyUsed;
                    $ctrl.clickName = "Regular";
                };

                $ctrl.$onInit = () => {
                    $ctrl.chatMessage = $ctrl.resolve.chatMessage;
                    $ctrl.resolve.chatMessage = "hello";
                    $timeout(() => {
                        $rootScope.$broadcast("rzSliderForceRender");
                    }, 100);
                };
            }
        });
}());
