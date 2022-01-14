"use strict";

(function() {

    angular
        .module("twitcherbotApp")
        .factory("accountAccess", function(logger, backendCommunicator, $route) {
            let service = {};

            service.accounts = {
                streamer: {
                    username: "Streamer",
                    loggedIn: false
                },
                bot: {
                    username: "Bot",
                    loggedIn: false
                }
            };

            service.getAccounts = () => {
                service.accounts = backendCommunicator.fireEventSync("getAccounts");
            };
            service.getAccounts();

            service.logoutAccount = (accountType) => {
                backendCommunicator.fireEvent("logoutAccount", accountType);
            };

            backendCommunicator.on("accountUpdate", accounts => {
                service.accounts = accounts;
                //账户登陆登出，例如achievement 与top chart等数据需要刷新
                $route.reload();
            });

            return service;
        });
}());
