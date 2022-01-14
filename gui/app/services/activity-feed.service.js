"use strict";

(function() {

    const marked = require("marked");
    const { sanitize } = require("dompurify");

    angular
        .module("twitcherbotApp")
        .factory("activityFeedService", function($q, $sce, $translate, $rootScope, logger, backendCommunicator, utilityService, gaService,
            settingsService, ngToast) {
            let service = {};

            service.allActivities = [];
            service.activities = [];

            backendCommunicator.on("event-activity", (activity) => {

                activity.originMessage = activity.message;
                if (activity.event.id === 'follow') {
                    activity.originMessage = `${activity.message.split(" ")[0]}** ${activity.message.split(" ")[2]}`;
                }
                activity.message = $sce.trustAsHtml(sanitize(marked(activity.message)));

                service.allActivities.unshift(activity);
                if (service.allActivities.length > 500) {
                    service.allActivities.length = 500;
                }

                const allowedEvents = settingsService.getAllowedActivityEvents();
                if (!allowedEvents.includes(`${activity.source.id}:${activity.event.id}`)) {
                    return;
                }

                service.activities.unshift(activity);
                service.freshTranslate();
                if (service.activities.length > 100) {
                    service.activities.length = 100;
                }
            });

            $rootScope.$on("langChanged", () => {
                service.freshTranslate(true);
            });

            service.freshTranslate = (freshAll = false) => {
                service.activities.forEach((activity) => {
                    if (!freshAll && activity.messageDisplay) { // 有翻译结果无需处理
                        return;
                    }
                    $translate(`DASHBOARD.ACTIVITY_FEED.MESSAGE.${activity.event.id}`).then((ret) => {
                        switch (activity.event.id) {
                        case "host":
                            // `**${eventData.username}** hosted with **${eventData.viewerCount}** viewer(s)`
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret[0]} ${ret[1]} ${activity.originMessage[3]} ${ret[2]}`;
                            break;
                        case "raid":
                            // `**${eventData.username}** raided with **${eventData.viewerCount}** viewer(s)`
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret[0]} ${ret[1]} ${activity.originMessage[3]} ${ret[2]}`;
                            break;
                        case "follow":
                            // `**${eventData.username}** followed`;
                            activity.messageDisplay = `${activity.originMessage.split(" ")[0]} ${ret}`;
                            break;
                        case "sub":
                            // `**${eventData.username}** ${eventData.isResub ? 'resubscribed' : 'subscribed'} for **${eventData.totalMonths} month(s)** ${eventData.subPlan === 'Prime' "with **Twitch Prime**" : "at **Tier " + eventData.subPlan.replace("000", "") + "**"}`;
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${activity.originMessage[1]} ${ret[0]} ${activity.originMessage[3]} ${ret[1]} ${activity.originMessage.slice(5)}`;
                            break;
                        case "subs-gifted":
                            // `**${eventData.gifterUsername}** gifted a ${eventData.giftSubMonths > 1 ? ` **${eventData.giftSubMonths} month** ` : ''} **${eventData.subPlan === 'Prime' ? "Twitch Prime" : "Tier " + eventData.subPlan.replace("000", "")}** sub to **${eventData.gifteeUsername}**`;
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret[0]} ${ret[1]} ${activity.originMessage.slice(3)}`;
                            break;
                        case "community-subs-gifted":
                            // `**${eventData.username}** gifted **${eventData.subCount} Tier ${eventData.subPlan.replace("000", "")}** sub${eventData.subCount > 1 ? 's' : ''} to the community`
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret[0]} ${activity.originMessage[2]} ${ret[1]} ${activity.originMessage[4]} ${activity.originMessage[5]} ${ret.slice(2)}`;
                            break;
                        case "viewer-arrived":
                            // `**${eventData.username}** arrived`;
                            activity.messageDisplay = `${activity.originMessage.split(" ")[0]} ${ret}`;
                            break;
                        case "banned":
                            activity.originMessage = activity.originMessage.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret}`;
                            break;
                        case "timeout":
                            // `**${eventData.username}** was timed out for **${eventData.timeoutDuration} sec(s)**`
                            activity.originMessage = activity.originMessage.split(" ");
                            ret = ret.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret[0]} ${ret[1]} ${ret[2]} ${activity.originMessage[5]} ${ret[3]}`;
                            break;
                        case "whisper":
                            // `**${eventData.username}** sent you the following whisper: ${eventData.message}`
                            activity.originMessage = activity.originMessage.split(" ");
                            activity.messageDisplay = `${activity.originMessage[0]} ${ret} ${activity.originMessage[6]}`;
                            break;
                        /** 下方3个事件暂不支持展示
                        case "cheer":
                        case "chat-message":
                        case "channel-reward-redemption":
                        */
                        }
                        activity.messageDisplay = $sce.trustAsHtml(sanitize(marked(activity.messageDisplay)));
                    }).catch((e) => {
                        activity.messageDisplay = activity.message;
                    });
                });
            };

            service.allAcknowledged = () => {
                if (service.activities.length < 1) {
                    return false;
                }
                return !service.activities.some(a => a.acknowledged === false);
            };

            service.markAllAcknowledged = () => {
                service.allActivities.forEach(a => {
                    a.acknowledged = true;
                });
            };

            service.markAllNotAcknowledged = () => {
                service.allActivities.forEach(a => {
                    a.acknowledged = false;
                });
            };

            service.toggleMarkAllAcknowledged = () => {
                if (service.allAcknowledged()) {
                    service.markAllNotAcknowledged();
                } else {
                    service.markAllAcknowledged();
                }
            };

            service.unacknowledgedCount = () => {
                return service.activities.filter(a => !a.acknowledged).length;
            };

            backendCommunicator.on("acknowledge-all-activity", () => {
                service.markAllAcknowledged();
            });

            service.retriggerEvent = (activityId) => {
                backendCommunicator.send("retrigger-event", activityId);
                ngToast.create({
                    className: 'success',
                    content: "Successfully retriggered event!",
                    timeout: 5000
                });
            };

            service.showEditActivityFeedEventsModal = () => {
                utilityService.showModal({
                    component: "editActivityEventsModal",
                    size: "sm",
                    closeCallback: () => {
                        const allowedEvents = settingsService.getAllowedActivityEvents();
                        service.activities = service.allActivities
                            .filter(a => allowedEvents.includes(`${a.source.id}:${a.event.id}`));
                        service.freshTranslate();
                    }
                });
                gaService.sendEvent("dashboard", "open", "activity feed filter");
            };

            return service;
        });
}());
