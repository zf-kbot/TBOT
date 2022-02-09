"use strict";
(function () {
    const electron = require("electron");

    const profileManager = require("../../backend/common/profile-manager");

    const moment = require("moment");
    moment.locale(electron.remote.app.getLocale());

    angular.module('exceptionOverwrite', [])
        .factory('$exceptionHandler', function() {
            return function(exception, cause) {
                console.log(electron.remote.app.isPackaged);
                if (electron.remote.app.isPackaged) {
                    // fundebug.notifyError(exception);
                }
            };
        });

    agGrid.initialiseAgGridWithAngular1(angular); // eslint-disable-line no-undef

    let app = angular.module("twitcherbotApp", [
        "ngAnimate",
        "ngRoute",
        "ui.bootstrap",
        "rzModule",
        "ui.select",
        "ngSanitize",
        "ui.select",
        "ui.sortable",
        "ui.validate",
        "ebScrollLock",
        "summernote",
        "pascalprecht.translate",
        "ngToast",
        "agGrid",
        'ngYoutubeEmbed',
        'countUpModule',
        'pageslide-directive',
        'ui.bootstrap.contextMenu',
        'color.picker',
        'ngAria',
        'ui.codemirror',
        'exceptionOverwrite'
    ]);

    app.config([
        "$translateProvider",
        function ($translateProvider) {
            $translateProvider
                .useStaticFilesLoader({
                    prefix: "lang/locale-",
                    suffix: ".json"
                })
                .preferredLanguage("en");
        }
    ]);

    app.run(function initializeApplication($translate, settingsService) {
        $translate.use(settingsService.getLang());
    });

    app.controller("StandAloneChatBoxController", function ($scope, $rootScope, connectionService, settingsService, logger) {
        $rootScope.showSpinner = true;

        $scope.currentProfileId = profileManager.getLoggedInProfile();

        /**
         * Initial App Load
         */
        $scope.cs = connectionService;
        //$scope.accounts = connectionService.accounts;
        //$scope.profiles = connectionService.profiles;

        $scope.customFontCssPath = profileManager.getPathInProfile("/fonts/fonts.css");

        // Apply Theme
        $scope.appTheme = function () {
            return settingsService.getTheme();
        };
        $rootScope.showSpinner = false;
    });

    angular.module("twitcherbotApp").config([
        "$routeProvider",
        "$locationProvider",
        function ($routeProvider) {
            $routeProvider
                .when("/", {
                    templateUrl: "./templates/chat/_kol_pop-chat-message.html",
                    controller: "popChatMessagesController"
                });
        }
    ]);

} (angular));