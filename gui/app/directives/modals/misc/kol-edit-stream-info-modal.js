"use strict";

(function () {
    angular.module("twitcherbotApp")
        .component("kolEditStreamInfoModal", {
            template: `
                <div style="background:#101111;">
                    <form name="streamInfo" style="boder-radius:10px;">
                        <div style="background:#24262A;padding:5px;">
                            <div style="display:flex;flex:1;margin-bottom:3px;height:25%;"class="form-group"  ng-class="{'has-error': $ctrl.formFieldHasError('title')}">
                                <input 
                                    style="color:white;background:#101111;"
                                    type="text" 
                                    id="title" 
                                    name="title"
                                    required 
                                    class="form-control input-lg btn-default"
                                    placeholder="Set the title on Twitch" 
                                    ng-model="$ctrl.streamInfo.title" 
                                    ng-change="$ctrl.save()"
                                    ng-disabled="!$ctrl.dataLoaded"
                                />
                            </div>

                            <div class="form-group" style="margin-bottom:4px;">
                                <ui-select ng-model="$ctrl.selectedGame" required input-id="game" theme="bootstrap" spinner-enabled="true" on-select="$ctrl.gameSelected($item)" ng-disabled="!$ctrl.dataLoaded">
                                    <ui-select-match placeholder="Search for category...">
                                        <div style="height: 25px; display:flex; flex-direction: row; align-items: center;">
                                            <img style="height: 21px; width: 21px; border-radius: 5px; margin-right:5px;" ng-src="{{$select.selected.boxArtUrl}}">
                                            <div style="font-weight: 100;font-size: 17px;background:#101111;">{{$select.selected.name}}</div>
                                        </div>
                                    </ui-select-match>
                                    <ui-select-choices minimum-input-length="1" repeat="game in $ctrl.games | filter: $select.search" refresh="$ctrl.searchGames($select.search)" refresh-delay="200" style="position:relative;">
                                        <div style="height: 35px; display:flex; flex-direction: row; align-items: center;">
                                            <img style="height: 30px; width: 30px; border-radius: 5px; margin-right:10px;" ng-src="{{game.boxArtUrl}}">
                                            <div style="font-weight: 100;font-size: 17px;">{{game.name}}</div>
                                        </div>                                  
                                    </ui-select-choices>
                                </ui-select>
                            </div>

                            <div class="form-group" style="margin-bottom:4px;">
                                <ui-select ng-model="$ctrl.selectedTags" required input-id="tag" theme="bootstrap" spinner-enabled="true" on-select="$ctrl.tagSelected($item)" ng-disabled="!$ctrl.dataLoaded">
                                    <ui-select-match placeholder="Search for tag...">
                                        <div style="height: 25px; display:flex; flex-direction: row; align-items: center;">
                                            <div style="font-weight: 100;font-size: 17px;background:#101111;">{{$select.selected.name}}</div>
                                        </div>
                                    </ui-select-match>
                                    <ui-select-choices minimum-input-length="1" repeat="tag in $ctrl.localTags | filter: $select.search" refresh="$ctrl.searchTags($select.search)" refresh-delay="200" style="position:relative;">
                                        <div style="height: 35px; display:flex; flex-direction: row; align-items: center;">
                                            <div style="font-weight: 100;font-size: 17px;">{{tag.name}}</div>
                                        </div>
                                    </ui-select-choices>
                                </ui-select>
                                <div >
                                    <span class="kol-message-tip" style="line-height:25px;">
                                        <span ng-repeat="tag in $ctrl.tags " ng-click="$ctrl.delete({ name: tag })" class="ng-binding ng-scope" role="button" style="background-color:black;color:#CAC8C8;padding-top:1px;padding-left:0px;margin-left:0px;">
                                            {{tag.name}}<i class="fa fa-times-circle purple" aria-hidden="true"></i>
                                        </span>
                                    </span>

                                    <!-- <button type="button" class="btn btn-primary" ng-click="$ctrl.saveTags()" style="padding:1px 5px;">Save</button> -->
                                </div>
                            </div>
                            <!--
                            <div class="form-group" ng-class="{'has-error': $ctrl.formFieldHasError('title')}" style="margin-bottom:0px;">
                                <textarea 
                                    style="color:white;background:#101111;min-height:115px;max-height:200px;"
                                    rows="4"
                                    id="title" 
                                    name="title" 
                                    class="form-control btn-default"
                                    placeholder="Setup the chat standard" 
                                    ng-model="$ctrl.streamInfo.chart_standard" 
                                    ng-change="$ctrl.save()"
                                    ng-disabled="!$ctrl.dataLoaded"
                                ></textarea>
                            </div>
                            -->
                        </div>    
                    </form>
                </div>
                <!--<div class="modal-footer">
                    <button type="button" class="btn btn-default" ng-click="$ctrl.dismiss()">Cancel</button>
                    <button type="button" class="btn btn-primary" ng-click="$ctrl.save()">Save</button>
                </div>-->
            `,
            bindings: {
                resolve: "<",
                close: "&",
                dismiss: "&"
            },
            controller: function ($scope, $rootScope, ngToast, backendCommunicator, kolHistoryService, logger, profileManager) {
                const $ctrl = this;

                $ctrl.dataLoaded = false;

                $ctrl.games = [];
                $ctrl.tags = [];
                $ctrl.localTags = [];

                $ctrl.streamInfo = {
                    title: "",
                    gameId: 0,
                    tagsId: [],
                    chart_standard: ""
                };

                $ctrl.selectedGame = null;
                $ctrl.selectedTags = null;

                $ctrl.formFieldHasError = (fieldName) => {
                    return ($scope.streamInfo.$submitted || $scope.streamInfo[fieldName].$touched)
                        && $scope.streamInfo[fieldName].$invalid;
                };

                let init = () => {
                    backendCommunicator.fireEventAsync("get-channel-info")
                        .then((streamInfo) => {
                            if (streamInfo) {
                                $ctrl.streamInfo = streamInfo;
                                $ctrl.dataLoaded = true;
                                backendCommunicator.fireEventAsync("get-twitch-game", $ctrl.streamInfo.gameId)
                                    .then(game => {
                                        if (game != null) {
                                            $ctrl.selectedGame = game;
                                        }
                                    });
                                $ctrl.localTags = profileManager.getJsonDbInProfile("/streamtags").getData("/stream");
                                //set tags=[] before update or refresh infomation
                                $ctrl.tags = [];
                                backendCommunicator.fireEventAsync("get-twitch-tags", $ctrl.streamInfo)
                                    .then(value => {
                                        value.map(c => {
                                            $ctrl.tags.push(c);
                                        });
                                    });
                            }
                        });
                };

                $ctrl.$onInit = () => {
                    init();
                };

                backendCommunicator.on("auth-success", init);
                backendCommunicator.on("channel-info-update", init);
                $rootScope.$on("refreshStreamInfo", init);

                $ctrl.searchGames = function (gameQuery) {
                    backendCommunicator.fireEventAsync("search-twitch-games", gameQuery)
                        .then(games => {
                            if (games != null) {
                                $ctrl.games = games;
                            }
                        });
                };

                $ctrl.searchTags = function (tagQuery) {
                    $ctrl.localTags = backendCommunicator.fireEventAsync("search-twitch-tags", tagQuery);
                    $ctrl.localTags.then(function (tagsArr) {
                        //求tagsArr与$ctrl.tags的差集，在只让用户选择非重复的tag
                        let difference = tagsArr.filter(v => {
                            for (let i = 0; i < $ctrl.tags.length; i++) {
                                if (v.id === $ctrl.tags[i].id) {
                                    return;
                                }
                            }
                            return v;
                        });
                        $ctrl.localTags = difference;
                    });
                };

                $ctrl.gameSelected = function (game) {
                    if (game != null) {
                        $ctrl.streamInfo.gameId = game.id;
                        $ctrl.save();
                    }
                };

                $ctrl.tagSelected = function (tag) {
                    if (tag != null) {
                        //最多只能选择5个tag
                        if ($ctrl.tags.length < 5) {
                            for (let i = 0; i < $ctrl.tags.length; i++) {
                                if (tag.id === $ctrl.tags[i].id) {
                                    ngToast.create($ctrl.tags[i].name + "is already exist");
                                    return;
                                }
                            }
                            $ctrl.tags.push(tag);
                            $ctrl.saveTags();
                            $ctrl.selectedTags = null;
                        } else {
                            ngToast.create("you can only select up to 5 tags at the same time.");
                        }
                    }
                };

                $ctrl.save = kolDebounce(() => {
                    backendCommunicator.fireEventAsync("set-channel-info", $ctrl.streamInfo);
                    ngToast.create({
                        className: 'success',
                        content: "Updated stream info!"
                    });
                    kolHistoryService.pushHistoryMsg('Changed channel info');
                    $ctrl.dismiss();
                }, 1000);

                $ctrl.saveTags = () => {
                    let tagsId = [];
                    $ctrl.tags.map(e => {
                        tagsId.push(e.id);
                    });
                    backendCommunicator.fireEventAsync("set-channel-tags", tagsId);
                    ngToast.create({
                        className: 'success',
                        content: "Updated stream tags!"
                    });
                    kolHistoryService.pushHistoryMsg('Changed channel tags');
                };

                $ctrl.delete = (tag) => {
                    for (let i = 0; i < $ctrl.tags.length; i++) {
                        if ($ctrl.tags[i].id === tag.name.id) {
                            $ctrl.tags.splice(i, 1);
                            i--;
                            $ctrl.saveTags();
                            return;
                        }
                    }
                };

                let clearStreamerRoomInfo = () => {
                    $ctrl.streamInfo = {
                        title: "",
                        gameId: 0,
                        tagsId: [],
                        chart_standard: ""
                    };
                    $ctrl.selectedGame = null;
                };

                backendCommunicator.on("accountUpdate", cache => {
                    if (!cache.streamer.loggedIn) {
                        clearStreamerRoomInfo();
                        $ctrl.dataLoaded = false;
                    } else {
                        $ctrl.dataLoaded = true;
                    }
                });
            }
        });
}());
