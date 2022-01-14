"use strict";

(function() {
    angular.module("twitcherbotApp")
        .component("chatSettingsModal", {
            template: `
                <div class="modal-header">
                    <button type="button" class="close" ng-click="$ctrl.dismiss()"><span><i style="color: #9145ff;font-size: 30px" class="fa fa-times-circle"></i></span></button>
                    <h4 class="modal-title">{{$ctrl.translations['DASHBOARD.SETTING.CHAT_SETTINGS']}}</h4>
                </div>
                <div class="modal-body">
                    <h4 >{{$ctrl.translations['DASHBOARD.SETTING.UI_SETTINGS']}}</h4>
                    <div style="padding: 0 10px">
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.CHAT_USER_LIST']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="cb5" type="checkbox"
                                    ng-checked="settings.getShowChatViewerList()"
                                    ng-click="settings.setShowChatViewerList(!settings.getShowChatViewerList())"/>
                                <label class="tgl-btn" for="cb5"></label>
                            </span>
                        </div>
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.STREAM_INFO']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="streamInfo" type="checkbox"
                                    ng-checked="settings.showStreamInfo()"
                                    ng-click="settings.setShowStreamInfo(!settings.showStreamInfo())"/>
                                <label class="tgl-btn" for="streamInfo"></label>
                            </span>
                        </div>
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.HISTORY']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="history" type="checkbox"
                                    ng-checked="settings.showHistory()"
                                    ng-click="settings.setShowHistory(!settings.showHistory())"/>
                                <label class="tgl-btn" for="history"></label>
                            </span>
                        </div>
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.ACTIVITY_FEED']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="activityfeed" type="checkbox"
                                    ng-checked="settings.showActivityFeed()"
                                    ng-click="settings.setShowActivityFeed(!settings.showActivityFeed())"/>
                                <label class="tgl-btn" for="activityfeed"></label>
                            </span>
                        </div>
                    </div>
                    <h4 >{{$ctrl.translations['DASHBOARD.SETTING.DISPLAY_DETAILS_SETTINGS']}}</h4>
                    <div style="padding: 0 10px">
                        <div>
                            <div style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.TAG_NOTIFICATION_SOUND']}}</div>
                            <span class="btn-group" uib-dropdown style="margin-bottom: 5px;">
                                <button type="button" class="btn btn-primary" uib-dropdown-toggle>
                                    {{selectedNotificationSound.name}} <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu" uib-dropdown-menu role="menu">
                                    <li role="menuitem" ng-repeat="n in notificationOptions">
                                        <a href ng-click="selectNotification(n)">{{n.name}}</a>
                                    </li>
                                </ul>
                            </span>
                            <span class="clickable" ng-click="playNotification()" style="color: #9145ff; font-size: 18px; padding-left: 5px;">
                                <i class="fa fa-play-circle"></i>
                            </span>
                            <file-chooser ng-show="selectedNotificationSound.name === 'Custom'"
                                model="selectedNotificationSound.path"
                                options="{title: 'Select Sound File', filters: [{name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'flac']}]}"
                                on-update="setCustomNotiPath(filepath)"></file-chooser>
                            <div class="volume-slider-wrapper" ng-hide="selectedNotificationSound.name === 'None'">
                                <i class="fa fa-volume-down volume-low" style="font-size:25px; padding-bottom:5px"></i>
                                <rzslider rz-slider-model="notificationVolume" rz-slider-options="sliderOptions"></rzslider>
                                <i class="fa fa-volume-up volume-high" style="font-size:25px; padding-bottom:5px"></i>
                            </div>
                        </div>
                        <div>
                            <div style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.DISPLAY_STYLE']}}</div>
                            <div class="permission-type controls-fb-inline">
                                <label class="control-fb control--radio">{{$ctrl.translations['DASHBOARD.SETTING.MODERN']}}
                                <input type="radio" ng-model="compactMode" ng-value="false" ng-click="toggleCompactMode()"/>
                                <div class="control__indicator"></div>
                                </label>
                                <label class="control-fb control--radio">{{$ctrl.translations['DASHBOARD.SETTING.COMPACT']}}
                                    <input type="radio" ng-model="compactMode" ng-value="true" ng-click="toggleCompactMode()"/>
                                    <div class="control__indicator"></div>
                                </label>
                            </div>
                        </div>
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">Alternate Backgrounds</span>
                            <span>
                                <input class="tgl tgl-light" id="cb9" type="checkbox"
                                    ng-checked="settings.chatAlternateBackgrounds()"
                                    ng-click="settings.setChatAlternateBackgrounds(!settings.chatAlternateBackgrounds())"/>
                                <label class="tgl-btn" for="cb9"></label>
                            </span>
                        </div>
                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.HIDE_DELETED_MESSAGES']}} <tooltip text= "$ctrl.translations['DASHBOARD.SETTING.HIDE_DELETED_MESSAGES_DESC']"></tooltip></span>
                            <span>
                                <input class="tgl tgl-light" id="cb10" type="checkbox"
                                    ng-checked="settings.chatHideDeletedMessages()"
                                    ng-click="settings.setChatHideDeletedMessages(!settings.chatHideDeletedMessages())"/>
                                <label class="tgl-btn" for="cb10"></label>
                            </span>
                        </div>

                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.SHOW_AVATARS']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="cb11" type="checkbox"
                                    ng-checked="settings.getShowAvatars()"
                                    ng-click="settings.setShowAvatars(!settings.getShowAvatars())"/>
                                <label class="tgl-btn" for="cb11"></label>
                            </span>
                        </div>

                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.SHOW_TIMESTAMPS']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="cb12" type="checkbox"
                                    ng-checked="settings.getShowTimestamps()"
                                    ng-click="settings.setShowTimestamps(!settings.getShowTimestamps())"/>
                                <label class="tgl-btn" for="cb12"></label>
                            </span>
                        </div>

                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.BTTV_FFZ_EMOTES']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="cb13" type="checkbox"
                                    ng-checked="settings.getShowThirdPartyEmotes()"
                                    ng-click="settings.setShowThirdPartyEmotes(!settings.getShowThirdPartyEmotes())"/>
                                <label class="tgl-btn" for="cb13"></label>
                            </span>
                        </div>

                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.SHOW_PRONOUNS']}} <a href="https://pronouns.alejo.io/" target="_blank" style="font-size:10px;"><i class="fa fa-external-link"></i></a></span>
                            <span>
                                <input class="tgl tgl-light" id="cb14" type="checkbox"
                                    ng-checked="settings.getShowPronouns()"
                                    ng-click="settings.setShowPronouns(!settings.getShowPronouns())"/>
                                <label class="tgl-btn" for="cb14"></label>
                            </span>
                        </div>

                        <div style="display: flex;align-items: center;justify-content: space-between;">
                            <span style="font-weight: 900;">{{$ctrl.translations['DASHBOARD.SETTING.CUSTOM_FONT_SIZE']}}</span>
                            <span>
                                <input class="tgl tgl-light" id="cb15" type="checkbox"
                                    ng-checked="settings.getChatCustomFontSizeEnabled()"
                                    ng-click="toggleCustomFontEnabled()"/>
                                <label class="tgl-btn" for="cb15"></label>
                            </span>
                        </div>
                        <div class="volume-slider-wrapper" ng-show="settings.getChatCustomFontSizeEnabled()">
                            <rzslider rz-slider-model="customFontSize" rz-slider-options="fontSliderOptions"></rzslider>
                        </div>

                    </div>
                </div>
                <div class="modal-footer">
                </div>
            `,
            bindings: {
                resolve: "<",
                close: "&",
                dismiss: "&"
            },
            controller: function($scope, $rootScope, $timeout, settingsService, soundService, $translate) {
                const $ctrl = this;
                $ctrl.translations = {
                    "DASHBOARD.SETTING.CHAT_SETTINGS": "",
                    "DASHBOARD.SETTING.UI_SETTINGS": "",
                    "DASHBOARD.SETTING.CHAT_USER_LIST": "",
                    "DASHBOARD.SETTING.STREAM_INFO": "",
                    "DASHBOARD.SETTING.HISTORY": "",
                    "DASHBOARD.SETTING.ACTIVITY_FEED": "",
                    "DASHBOARD.SETTING.DISPLAY_DETAILS_SETTINGS": "",
                    "DASHBOARD.SETTING.TAG_NOTIFICATION_SOUND": "",
                    "DASHBOARD.SETTING.DISPLAY_STYLE": "",
                    "DASHBOARD.SETTING.MODERN": "",
                    "DASHBOARD.SETTING.COMPACT": "",
                    "DASHBOARD.SETTING.ALTERNATE_BACKGROUNDS": "",
                    "DASHBOARD.SETTING.HIDE_DELETED_MESSAGES": "",
                    "DASHBOARD.SETTING.HIDE_DELETED_MESSAGES_DESC": "",
                    "DASHBOARD.SETTING.SHOW_AVATARS": "",
                    "DASHBOARD.SETTING.SHOW_TIMESTAMPS": "",
                    "DASHBOARD.SETTING.BTTV_FFZ_EMOTES": "",
                    "DASHBOARD.SETTING.SHOW_PRONOUNS": "",
                    "DASHBOARD.SETTING.CUSTOM_FONT_SIZE": ""

                };
                const translationsRes = $translate.instant(Object.keys($ctrl.translations));
                for (let key in translationsRes) {
                    if ({}.hasOwnProperty.call($ctrl.translations, key)) {
                        $ctrl.translations[key] = translationsRes[key];
                    }
                }
                $scope.settings = settingsService;

                $scope.compactMode = settingsService.isChatCompactMode();
                $scope.toggleCompactMode = function() {
                    $scope.compactMode = !$scope.compactMode;
                    settingsService.setChatCompactMode($scope.compactMode);
                };

                $scope.playNotification = function() {
                    soundService.playChatNotification();
                };

                $scope.selectedNotificationSound = settingsService.getTaggedNotificationSound();

                $scope.notificationVolume = settingsService.getTaggedNotificationVolume();

                $scope.volumeUpdated = function() {
                    settingsService.setTaggedNotificationVolume($scope.notificationVolume);
                };

                $scope.sliderOptions = {
                    floor: 1,
                    ceil: 10,
                    hideLimitLabels: true,
                    onChange: $scope.volumeUpdated
                };

                $scope.notificationOptions = soundService.notificationSoundOptions;

                $scope.selectNotification = function(n) {
                    $scope.selectedNotificationSound = n;
                    $scope.saveSelectedNotification();
                };

                $scope.setCustomNotiPath = function(filepath) {
                    $scope.selectedNotificationSound.path = filepath;
                    $scope.saveSelectedNotification();
                };

                $scope.saveSelectedNotification = function() {
                    let sound = $scope.selectedNotificationSound;

                    settingsService.setTaggedNotificationSound({
                        name: sound.name,
                        path: sound.name === "Custom" ? sound.path : undefined
                    });
                };


                $scope.toggleCustomFontEnabled = () => {
                    settingsService.setChatCustomFontSizeEnabled(!settingsService.getChatCustomFontSizeEnabled());
                    $timeout(() => {
                        $rootScope.$broadcast("rzSliderForceRender");
                    }, 50);
                };

                $scope.customFontSize = settingsService.getChatCustomFontSize();
                $scope.fontSizeUpdated = function() {
                    settingsService.setChatCustomFontSize($scope.customFontSize);
                };
                $scope.fontSliderOptions = {
                    floor: 10,
                    ceil: 30,
                    translate: value => `${value}px`,
                    onChange: $scope.fontSizeUpdated
                };

                $ctrl.$onInit = () => {
                    $timeout(() => {
                        $rootScope.$broadcast("rzSliderForceRender");
                    }, 100);
                };
            }
        });
}());
