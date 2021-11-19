"use strict";

(function() {
    angular.module("twitcherbotApp")
        .component("kolChatEmotesModal", {
            template: `
            <!-- <kol-emotebar class="noselect"></kol-emotebar> -->
            <div>
                <div style="display:flex ;flex-direction:row" >
                    <div style= "display:flex;flex-direction:column;background:#101111;">
                        <div class="modalsidebar">
                            <div class="nav-link-bar" ng-if="$ctrl.clickName == 'Regular'" ></div>
                            <div class="nav-link-bar" style="background-color:#101111;" ng-if="$ctrl.clickName != 'Regular'" ></div>
                            <button class="settings-btn" ng-click="$ctrl.clickFrequentlyUsed()" aria-label="Chat Settings" style="height:35px;">
                                <i class="fal fa-clock" title = "Regular"></i>
                            </button>
                        </div>
                        <div class="modalsidebar">
                            <div class="nav-link-bar" ng-if="$ctrl.clickName == 'Global'"></div>
                            <div class="nav-link-bar" style="background-color:#101111;" ng-if="$ctrl.clickName != 'Global'" ></div>
                            <button class="settings-btn" ng-click="$ctrl.clickGlobal()" aria-label="Chat Settings" style="height:35px;">
                                <i class="fal fa-globe" title = "Global"></i>
                            </button>
                        </div>
                    </div>
                    <div style="width:100%;height:335px;">
                        <div style="height:35px;">
                            <span style= "display:inline-block;margin-top:5px;padding-left:10px;font-size:18px;">{{$ctrl.clickName}}</span>
                            <button type="button" class="close" aria-label="Close" ng-click="$ctrl.dismiss()" >
                                <span aria-hidden="true"><i style="font-size: 22px;font-weight:200;margin-right:10px;margin-top:5px;" class="fas fa-times"></i></span>
                            </button>
                        </div>
                        <span ng-if="$ctrl.cs.sidebarServicesOverallStatus == 'disconnected'" style="display:inline-block; color: white; font-size: 1.2em; text-align: center; padding-left:5px;margin-top:30%;" class="ng-binding" >
                            The Emote will accessable when Twitchbot is connected.
                        </span>
                        <div ng-show="$ctrl.cs.sidebarServicesOverallStatus == 'connected'" style="width:100%;height:300px;overflow:auto;padding-left:5px;">
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
            controller: function($scope, $rootScope, $timeout, settingsService, chatMessagesService, connectionService, profileManager, logger) {
                const $ctrl = this;
                $ctrl.cs = connectionService;
                $ctrl.cms = chatMessagesService;
                $ctrl.clickName = "Global";

                $ctrl.chatMessageAllemotes = chatMessagesService.allEmotes;

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
                //按照数组中元素的某个值大小降序排列，此处用于对表情数组中的使用次数进行排序
                $ctrl.compare = function compare(property) {
                    return function (obj1, obj2) {
                        let value1 = obj1[property];
                        let value2 = obj2[property];
                        return value2 - value1; //desc
                    };
                };

                $ctrl.frequentlyUsed = $ctrl.getEmoteMsgs("/emote");
                //将点击的表情code加入到输入框，并对点击的表情加入常用表情json文件且对点击次数加1
                $ctrl.addChatMessage = function(emote) {
                    $rootScope.$broadcast("clickEmoji", emote);

                    let msg = $ctrl.getEmoteMsgs(`/emote`);
                    let emoteIn = false;//用于记录点击的表情是否在常用表情的json文件中
                    //常用表情是否为空，为空就直接将表情点击次数记为1，并保存返回。
                    if (!msg.length) {
                        let emoteMsg = emote;
                        emoteMsg.count = 1;
                        msg.push(emoteMsg);
                        $ctrl.saveEmoteMsg(`/emote`, msg);
                        return true;
                    }
                    //判断点击表情在不在常用表情的json文件中，如果在，点击次数+1；如果不在，点击次数设为1，添加到表情列表中
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
                    //排序后保存到json文件中
                    let sortmsg = msg.sort($ctrl.compare("count"));
                    $ctrl.saveEmoteMsg(`/emote`, sortmsg);

                    // $ctrl.close();
                };

                $ctrl.clickGlobal = function () {
                    $ctrl.chatMessageAllemotes = chatMessagesService.allEmotes;
                    $ctrl.clickName = "Global";
                };
                //显示常用表情，只展示前24个表情图片
                $ctrl.clickFrequentlyUsed = function () {
                    $ctrl.frequentlyUsed = $ctrl.getEmoteMsgs("/emote");
                    if ($ctrl.frequentlyUsed.length > 24) {
                        $ctrl.frequentlyUsed = $ctrl.frequentlyUsed.slice(0, 24);
                    }
                    $ctrl.chatMessageAllemotes = $ctrl.frequentlyUsed;
                    $ctrl.clickName = "Regular";
                };

                $rootScope.$on("updateEmoji", (event, data) => {
                    $ctrl.chatMessageAllemotes = data;
                });
                //默认展示global表情
                $rootScope.$on("globalEmoji", (event, data) => {
                    $ctrl.chatMessageAllemotes = data;
                    $ctrl.clickName = "Global";
                });



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
