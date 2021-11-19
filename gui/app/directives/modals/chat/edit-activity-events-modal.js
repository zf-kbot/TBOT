"use strict";

(function() {
    angular.module("twitcherbotApp")
        .component("editActivityEventsModal", {
            template: `
            <div class="modal-header" style="text-align: center; margin-bottom: 15px;">
                <button type="button" class="close" ng-click="$ctrl.dismiss()"><span><i style="color: #9145ff;font-size: 30px" class="fas fa-times-circle"></i></span></button>
                <h4 class="modal-title">Filters</h4>
            </div>
            <div class="modal-body" style="padding: 0 35px">
              <!-- <p style="font-size: 18px; margin: 5px 0 5px 0;">Filter the events you want to see in the activity feed</p> -->
              <div class="viewer-db-switches">
                <!--
                <div style="margin-bottom: 10px;">
                    <searchbar placeholder-text="Search events" query="eventSearch" />
                </div>
                <div ng-hide="eventSearch && !!eventSearch.length" style="display: flex;align-items: center;justify-content: space-between;margin-bottom:10px;padding-bottom: 5px; border-bottom: 1px solid #585858;">
                        <span style="font-weight: 900;">Select All</span>
                        <span>
                            <input class="tgl tgl-light" id="select-all" type="checkbox" 
                            ng-checked="$ctrl.allEventsChecked()" 
                            ng-click="$ctrl.toggleAllEvents()"/>
                        <label class="tgl-btn" for="select-all"></label>
                    </span>
                </div>
                <div ng-repeat="event in $ctrl.events | orderBy:'eventName' | filter:eventSearch">
                  <div style="display: flex;align-items: center;justify-content: space-between;margin-bottom:5px;">
                      <span><span style="font-weight: 900;">{{event.eventName}}</span> <span>({{event.sourceName}})</span></span>
                      <span>
                          <input class="tgl tgl-light" id="{{event.sourceId}}:{{event.eventId}}" type="checkbox" 
                            ng-checked="$ctrl.eventIsChecked(event)" 
                            ng-click="$ctrl.toggleEventChecked(event)"/>
                        <label class="tgl-btn" for="{{event.sourceId}}:{{event.eventId}}"></label>
                      </span>
                  </div>
                </div>
                -->
                <div ng-repeat="filter in $ctrl.filters | orderBy:'name'">
                  <div style="display: flex;align-items: center;justify-content: space-between;margin-bottom:5px;">
                      <span><span style="font-weight: 900;">{{filter.name}}</span></span>
                      <span>
                          <input class="tgl tgl-light" id="filter: {{filter.id}}" type="checkbox" 
                            ng-checked="$ctrl.filterIsChecked(filter)" 
                            ng-click="$ctrl.toggleFilterChecked(filter)"/>
                        <label class="tgl-btn" for="filter: {{filter.id}}"></label>
                      </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer sticky-footer edit-activity-events-footer">
                <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">Cancel</button>
                <button type="button" class="btn btn-primary" ng-click="$ctrl.save()">Save</button>
            </div>
            <scroll-sentinel element-class="edit-activity-events-footer"></scroll-sentinel>
            `,
            bindings: {
                resolve: "<",
                close: "&",
                dismiss: "&"
            },
            controller: function($q, backendCommunicator, settingsService, logger, gaService, kolHistoryService) {
                let $ctrl = this;

                $ctrl.changedItem = [];
                $ctrl.events = [];
                $ctrl.filters = [];
                // event filter与底层event source的映射关系
                $ctrl.eventFilterMapper = {
                    follow: [
                        {
                            sourceId: "twitch",
                            eventId: "follow"
                        }
                    ],
                    // cheer: [
                    //     {
                    //         sourceId: "twitch",
                    //         eventId: "cheer"
                    //     }
                    // ],
                    viewer: [
                        {
                            sourceId: "twitch",
                            eventId: "viewer-arrived"
                        },
                        {
                            sourceId: "twitch",
                            eventId: "banned"
                        },
                        {
                            sourceId: "twitch",
                            eventId: "timeout"
                        },
                        {
                            sourceId: "twitch",
                            eventId: "whisper"
                        }
                    ],
                    sub: [
                        {
                            sourceId: "twitch",
                            eventId: "sub"
                        },
                        {
                            sourceId: "twitch",
                            eventId: "subs-gifted"
                        },
                        {
                            sourceId: "twitch",
                            eventId: "community-subs-gifted"
                        }
                    ],
                    host: [
                        {
                            sourceId: "twitch",
                            eventId: "host"
                        }
                    ],
                    raid: [
                        {
                            sourceId: "twitch",
                            eventId: "raid"
                        }
                    ]
                };

                $ctrl.allowedEvents = settingsService.getAllowedActivityEvents();
                $ctrl.allowedFilters = settingsService.getAllowedActivityEventFilters();

                // 修改为filter内部处理
                $q.when(backendCommunicator
                    .fireEventAsync("get-activity-feed-supported-events"))
                    .then(supportedEvents => {
                        if (supportedEvents != null) {
                            $ctrl.events = supportedEvents;
                        }
                    });

                $q.when(backendCommunicator
                    .fireEventAsync("get-activity-feed-supported-event-filters"))
                    .then(supportedFilters => {
                        if (supportedFilters != null) {
                            $ctrl.filters = supportedFilters;
                        }
                    });

                $ctrl.toggleEventChecked = function(event) {
                    let idx = $ctrl.changedItem.findIndex(item => item.sourceId === event.sourceId);
                    if (idx === -1) {
                        $ctrl.changedItem.push(event);
                    } else {
                        $ctrl.changedItem.splice(idx, 1);
                    }
                    const eventKey = `${event.sourceId}:${event.eventId}`;
                    if ($ctrl.eventIsChecked(event)) {
                        $ctrl.allowedEvents =
                            $ctrl.allowedEvents.filter(e => e !== eventKey);
                    } else {
                        $ctrl.allowedEvents.push(eventKey);
                    }
                };

                $ctrl.startEvent = event => {
                    const eventKey = `${event.sourceId}:${event.eventId}`;
                    if (!$ctrl.eventIsChecked(event)) {
                        $ctrl.allowedEvents.push(eventKey);
                    }
                };

                $ctrl.endEvent = event => {
                    const eventKey = `${event.sourceId}:${event.eventId}`;
                    if ($ctrl.eventIsChecked(event)) {
                        $ctrl.allowedEvents =
                            $ctrl.allowedEvents.filter(e => e !== eventKey);
                    }
                };

                $ctrl.eventIsChecked = function(event) {
                    return $ctrl.allowedEvents.includes(`${event.sourceId}:${event.eventId}`);
                };

                $ctrl.allEventsChecked = () => $ctrl.events.every(event =>
                    $ctrl.allowedEvents.includes(`${event.sourceId}:${event.eventId}`));

                $ctrl.toggleAllEvents = () => {
                    if ($ctrl.allEventsChecked()) {
                        $ctrl.allowedEvents = [];
                    } else {
                        $ctrl.allowedEvents = $ctrl.events.map(event =>
                            `${event.sourceId}:${event.eventId}`);
                    }
                };

                $ctrl.filterIsChecked = (filter) => {
                    return $ctrl.allowedFilters.includes(`filter: ${filter.id}`);
                };

                $ctrl.toggleFilterChecked = (filter) => {
                    let idx = $ctrl.changedItem.findIndex(item => item.id === filter.id);
                    if (idx === -1) {
                        $ctrl.changedItem.push(filter);
                    } else {
                        $ctrl.changedItem.splice(idx, 1);
                    }
                    const filterKey = `filter: ${filter.id}`;
                    if ($ctrl.filterIsChecked(filter)) {
                        $ctrl.allowedFilters =
                            $ctrl.allowedFilters.filter(e => e !== filterKey);
                    } else {
                        $ctrl.allowedFilters.push(filterKey);
                    }
                };

                $ctrl.updateActivityEvent = () => {
                    $ctrl.allowedEvents = [];
                    $ctrl.filters.forEach(f => {
                        let id = f.id;
                        if ($ctrl.allowedFilters.includes(`filter: ${f.id}`)) { // 开启对应event
                            $ctrl.eventFilterMapper[id].forEach(e => $ctrl.startEvent(e));
                        } else { // 关闭对应event
                            $ctrl.eventFilterMapper[id].forEach(e => $ctrl.endEvent(e));
                        }
                    });
                };

                $ctrl.save = () => {
                    $ctrl.updateActivityEvent();
                    settingsService.setAllowedActivityEventFilters($ctrl.allowedFilters);
                    settingsService.setAllowedActivityEvents($ctrl.allowedEvents);
                    $ctrl.close();
                    if ($ctrl.changedItem.length) {
                        gaService.sendEvent('dashboard', 'change', 'activity feed');
                        kolHistoryService.pushHistoryMsg('Changed activity feed');
                        $ctrl.changedItem = [];
                    }
                };

                $ctrl.$onInit = function() {};
            }
        });
}());
