"use strict";

(function() {
    angular
        .module("twitcherbotApp")
        .controller("kolLoyaltySettingController", function($scope, $translate, profileManager, utilityService, gaService) {
            gaService.sendEvent('loyalty_setting', 'open');
            const defaultSettings = {
                bonusSetting: {
                    viewTimeBonus: 5,
                    chatBonus: 1,
                    followBonus: 100,
                    subAndGiftSubBonus: 0,
                    bitBonus: 0
                },
                levelUpNotification: false,
                levelUpNotificationMessage: "@{username},you just advanced to level {level_num}!"
            };

            $scope.inputModels = {};
            $scope.upgradeNotificationTip = "";
            $translate(`LOYALSETTING.LEVEL_SETTING.UPGRADE_NOTIFICATION.TIP`).then((ret) => {
                $scope.upgradeNotificationTip = ret;
            });

            $scope.xpSettingsTranslation = [
                {id: "5_MINS_VIEW", text: "", tip: "", min: 0, max: 10},
                {id: "EACH_CHAT", min: 0, max: 3},
                {id: "NEW_FOLLOWING", min: 0, max: 200},
                {id: "NEW_SUB", min: 0, max: 400},
                {id: "EACH_BIT", min: 0, max: 100}
            ];
            $scope.xpSettingsTranslation.forEach((v) => {
                $translate(`LOYALSETTING.XP_SETTING.${v.id}.TEXT`).then((ret) => {
                    v.text = ret;
                });
                $translate(`LOYALSETTING.XP_SETTING.${v.id}.TIP`).then((ret) => {
                    v.tip = ret;
                });
            });
            $scope.xpSettingsOpacity = {
                "5_MINS_VIEW": 0,
                "EACH_CHAT": 0,
                "NEW_FOLLOWING": 0,
                "NEW_SUB": 0,
                "EACH_BIT": 0
            };

            function getChatNotificationsFile() {
                return profileManager.getJsonDbInProfile("/loyalty-community/loyalsetting");
            }

            function pushDataToFile(path, data) {
                try {
                    getChatNotificationsFile().push(path, data);
                } catch (err) {} //eslint-disable-line no-empty
            }

            function getDataFromFile(path) {
                try {
                    return getChatNotificationsFile().getData(path);
                } catch (err) {
                    return {};
                }
            }

            // 设置输入框数值
            const setInputSetting = (defaultSettingsCopy) => {
                $scope.inputModels['5_MINS_VIEW'] = defaultSettingsCopy.bonusSetting.viewTimeBonus;
                $scope.inputModels['EACH_CHAT'] = defaultSettingsCopy.bonusSetting.chatBonus;
                $scope.inputModels['NEW_FOLLOWING'] = defaultSettingsCopy.bonusSetting.followBonus;
                $scope.inputModels['NEW_SUB'] = defaultSettingsCopy.bonusSetting.subAndGiftSubBonus;
                $scope.inputModels['EACH_BIT'] = defaultSettingsCopy.bonusSetting.bitBonus;
                $scope.inputModels['levelUpNotification'] = defaultSettingsCopy.levelUpNotification;
                $scope.inputModels['levelUpNotificationMessage'] = defaultSettingsCopy.levelUpNotificationMessage;
            };

            // 获取loyal设置
            const getLoyalSetting = () => {
                let data = getDataFromFile("/");
                let defaultSettingsCopy = $.extend(true, {}, defaultSettings);
                if (!$.isEmptyObject(data)) {
                    defaultSettingsCopy = data;
                }
                setInputSetting(defaultSettingsCopy);
            };

            $scope.levelUpNotification = false;

            $scope.toggleLevelUpNotification = () => {
                $scope.levelUpNotification = !$scope.levelUpNotification;
                gaService.sendEvent('loyalty_setting', 'click', 'upgrade_notification');
            };

            // 设置保存方法
            $scope.save = () => {
                gaService.sendEvent('loyalty_setting', 'click', 'save');
                if (!$scope.isValid) {
                    return;
                }
                let defaultSettingsCopy = $.extend(true, {}, defaultSettings);
                defaultSettingsCopy.bonusSetting.viewTimeBonus = $scope.inputModels['5_MINS_VIEW'];
                defaultSettingsCopy.bonusSetting.chatBonus = $scope.inputModels['EACH_CHAT'];
                defaultSettingsCopy.bonusSetting.followBonus = $scope.inputModels['NEW_FOLLOWING'];
                defaultSettingsCopy.bonusSetting.subAndGiftSubBonus = $scope.inputModels['NEW_SUB'];
                defaultSettingsCopy.bonusSetting.bitBonus = $scope.inputModels['EACH_BIT'];
                defaultSettingsCopy.levelUpNotification = $scope.inputModels['levelUpNotification'];
                defaultSettingsCopy.levelUpNotificationMessage = $scope.inputModels['levelUpNotificationMessage'];
                pushDataToFile("/", defaultSettingsCopy);
                $scope.saveStatus = true;
                setTimeout(() => {
                    $scope.saveStatus = false;
                }, 2000);
            };

            $scope.saveStatus = false;
            $scope.isValid = true;

            $scope.resetInputSetting = () => {
                utilityService.showModal({
                    component: "loyalSettingResetConfirmModal",
                    size: "sm",
                    backdrop: true,
                    closeCallback: resp => {
                        let action = resp.action;
                        switch (action) {
                        case "confirm":
                            setInputSetting(defaultSettings);
                            break;
                        }
                    }
                });
            };

            $scope.onInputUpdate = () => {
                // 经验值校验
                let keys = Object.keys($scope.xpSettingsOpacity);
                $scope.isValid = true;
                keys.forEach((key, i) => {
                    $scope.xpSettingsOpacity[key] = 0;
                    if ($scope.inputModels[key] < $scope.xpSettingsTranslation[i].min ||
                        $scope.inputModels[key] > $scope.xpSettingsTranslation[i].max) {
                        $scope.xpSettingsOpacity[key] = 1;
                        $scope.isValid = false;
                    }
                });
            };

            const init = () => {
                getLoyalSetting();
            };
            init();
        });
}());