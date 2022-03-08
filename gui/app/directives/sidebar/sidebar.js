"use strict";

(function () {
    angular.module("twitcherbotApp").component("sidebar", {
        bindings: {},
        template: `
            <div class="fb-nav" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">
                <div class="nav-header">
                    <img class="nav-header-icon" ng-class="{'contracted': !$ctrl.sbm.navExpanded}" src="../images/logo_transparent.png">
                    <span class="nav-header-title" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">Twitchbot</span>
                    <span class="nav-expand-button" ng-class="{'contracted': !$ctrl.sbm.navExpanded}" ng-click="$ctrl.sbm.toggleNav()" aria-label="{{$ctrl.sbm.navExpanded ? 'Contract Sidebar' : 'Expand Sidebar'}}">
                        <i class="fa" ng-class="$ctrl.sbm.navExpanded ? 'fa-angle-left' : 'fa-angle-right'"></i>
                    </span>
                </div>
                <div class="nav-body-wrapper">
                    <div class="nav-links-wrapper" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">

                        <nav-link page="Chat Feed" name="{{'SIDEBAR.CHAT.CHAT_FEED' | translate }}" icon="fa-tachometer"></nav-link>
                        <nav-category page="Data" name="{{'SIDEBAR.DATA.DATA' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Achievement" name="{{'SIDEBAR.DATA.ACHIEVEMENT' | translate }}" icon="fa-area-chart"></nav-link>
                        <nav-link page="Top Chart" name="{{'SIDEBAR.DATA.TOP_CHART' | translate }}" icon="fa-trophy"></nav-link>

                        <nav-category name="{{'SIDEBAR.INTERACTIVETOOL.CATEGORY' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Polls" name="{{'SIDEBAR.INTERACTIVETOOL.POLL' | translate }}" icon="fa-chart-bar"></nav-link>
                        <nav-link page="Kol Chat Notifications" name="{{'SIDEBAR.INTERACTIVETOOL.CHAT_NOTIFICATIONS' | translate }}" icon="fa-commenting"></nav-link>

                        <nav-category name="{{'SIDEBAR.COMMAND.TITLE' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Kol-Timers" name="{{'SIDEBAR.COMMAND.TIMERS' | translate }}" icon="fa-clock"></nav-link>
                        <nav-link page="Auto Reply" name="{{'SIDEBAR.COMMAND.AUTOREPLY' | translate }}" icon="fa-reply"></nav-link>

                        <nav-category name="{{'SIDEBAR.GUARD.GUARD' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Message Filter" name="{{'SIDEBAR.GUARD.MESSAGEFILTER' | translate }}" icon="fa-filter"></nav-link>
                        <nav-link page="Blacklisted Words" name="{{'SIDEBAR.GUARD.BLACKLISTEDWORDS' | translate }}" icon="fa-minus-circle"></nav-link>
                        
                        <nav-category name="{{'SIDEBAR.LOYALTYCOMMUNITY.LOYALTYCOMMUNITY' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Kol Loyal Setting" name="{{'SIDEBAR.LOYALTYCOMMUNITY.LOYALSETTING' | translate }}" icon="fa-gear"></nav-link>
                        <nav-link page="Kol LEADERSHIP" name="{{'SIDEBAR.LOYALTYCOMMUNITY.LEADERSHIP' | translate }}" icon="fa-user"></nav-link>
                        
                    </div>
                </div>
               <!-- <div class="nav-body-wrapper">
                    <div class="nav-links-wrapper" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">

                        <nav-link page="Chat Feed" name="{{'SIDEBAR.CHAT.CHAT_FEED' | translate }}" icon="fa-signal-stream"></nav-link>

                        <nav-category name="{{'SIDEBAR.CHAT' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Commands" name="{{'SIDEBAR.CHAT.COMMANDS' | translate }}" icon="fa-exclamation"></nav-link>
                        <nav-link page="Games" name="Games" icon="fa-dice"></nav-link>

                        <nav-category name="{{'SIDEBAR.OTHER' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Events" name="{{'SIDEBAR.OTHER.EVENTS' | translate }}" icon="fa-list"></nav-link>
                        <nav-link page="Timers" name="{{'SIDEBAR.OTHER.TIMERS' | translate }}" icon="fa-clock-o"></nav-link>
                        <nav-link page="Channel Rewards" name="{{'SIDEBAR.OTHER.CHANNELREWARDS' | translate }}" icon="fa-gifts"></nav-link>
                        <nav-link page="Effects" name="Effects" icon="fa-magic"></nav-link>
                        <nav-link page="Hotkeys" name="{{'SIDEBAR.OTHER.HOTKEYS' | translate }}" icon="fa-keyboard"></nav-link>
                        <nav-link page="Counters" name="Counters" icon="fa-tally"></nav-link>
                        
                        <nav-category name="{{'SIDEBAR.MANAGEMENT' | translate }}" pad-top="true"></nav-category>
                        <nav-link page="Viewers" name="{{'SIDEBAR.MANAGEMENT.VIEWERS' | translate }}" icon="fa-users" ng-if="$ctrl.isViewerDBOn()"></nav-link>
                        <nav-link page="Viewer Roles" name="{{'SIDEBAR.MANAGEMENT.VIEWER_ROLES' | translate }}" icon="fa-user-tag"></nav-link>
                        <nav-link page="Moderation" name="{{'SIDEBAR.MANAGEMENT.MODERATION' | translate }}" icon="fa-gavel"></nav-link>
                        <nav-link page="Quotes" name="{{'SIDEBAR.MANAGEMENT.QUOTES' | translate }}" icon="fa-quote-right"></nav-link>
                        <nav-link page="Currency" name="{{'SIDEBAR.MANAGEMENT.CURRENCY' | translate }}" icon="fa-money-bill" ng-if="$ctrl.isViewerDBOn()"></nav-link>
                        <nav-link page="Settings" name="{{'SIDEBAR.MANAGEMENT.SETTINGS' | translate }}" icon="fa-cog"></nav-link>
                        <nav-link page="Updates" name="{{'SIDEBAR.MANAGEMENT.UPDATES' | translate }}" icon="fa-download" badge-text="$ctrl.updateIsAvailable() ? 'NEW' : ''"></nav-link>

                    </div>

                    <div>
                        <patronage-tracker ng-show="$ctrl.cs.accounts.streamer.partnered"></patronage-tracker>
            
                        <div class="connection-status-wrapper">
                            <div class='interactive-status-wrapper'>
                                <div class="interative-status-icon" 
                                    ng-class="{'contracted': !$ctrl.sbm.navExpanded, 'connected': $ctrl.cs.sidebarServicesOverallStatus === 'connected', 'partial-connected': $ctrl.cs.sidebarServicesOverallStatus === 'partial'}" 
                                    uib-tooltip-template="'connectTooltipTemplate.html'" 
                                    tooltip-placement="{{!$ctrl.sbm.navExpanded ? 'right-bottom' : 'top-left'}}"
                                    tooltip-append-to-body="true"
                                    ng-click="$ctrl.cs.toggleSidebarControlledServices()"
                                    tabindex="0"
                                    aria-label="{{ $ctrl.cs.sidebarServicesOverallStatus == 'connected' ? 'Disconnect Services' : 'Connect Services' }}">
                                    <i class="fa" ng-class="$ctrl.cs.isConnectingAll ? 'fa-refresh fa-spin force-white-text' : 'fa-power-off'"></i>
                                </div>
                                <div style="cursor:pointer;" ng-click="$ctrl.showConnectionPanelModal()">
                                    <div class="interactive-status-text">
                                        <div class="interative-status-title" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">
                                            <span>Connections</span>
                                        </div>
                                        <div class="interative-status-subtitle" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">
                                            <span style="width: 100%;display: flex;justify-content: space-between;margin-top: 5px;">
                                                <connection-icon type="chat"></connection-icon>
                                                <connection-icon type="overlay"></connection-icon>
                                                <connection-icon type="integrations" ng-if="$ctrl.is.oneIntegrationIsLinked()"></connection-icon>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            
                                <div class="connection-panel-btn" ng-class="{'contracted': !$ctrl.sbm.navExpanded}" uib-tooltip="Open Connection Panel" tooltip-append-to-body="true"
                                    ng-click="$ctrl.showConnectionPanelModal()">
                                    <span><i class="fa fa-external-link"></i></span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>-->

                <!-- Tooltip template -->
                <script type="text/ng-template" id="connectTooltipTemplate.html">
                    <div ng-if="!sbm.navExpanded">
                        <span>
                            <span><b>Twitch Status:</b></span>
                            </br>
                            <span>{{cs.connections['chat'] === 'connected' ? 'CONNECTED' : 'DISCONNECTED' | translate }}</span>
                            </br></br>
                        </span>
                    </div>
                    <span>{{'SIDEBAR.CONNECTIONS.MIXER_TOGGLE' | translate }}</span>
                </script>
            </div>
            `,
        controller: function (
            sidebarManager,
            updatesService,
            connectionService,
            integrationService,
            websocketService,
            utilityService,
            settingsService
        ) {
            let ctrl = this;

            ctrl.sbm = sidebarManager;

            ctrl.cs = connectionService;

            ctrl.wss = websocketService;

            ctrl.is = integrationService;

            ctrl.isViewerDBOn = settingsService.getViewerDB;

            ctrl.showConnectionPanelModal = function () {
                utilityService.showModal({
                    component: "connectionPanelModal",
                    windowClass: "connection-panel-modal",
                    backdrop: true
                });
            };

            ctrl.updateIsAvailable = () => {
                return updatesService.updateIsAvailable();
            };

            ctrl.$onInit = function () { };
        }
    });
}());
