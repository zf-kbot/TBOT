"use strict";

/**
 * The twitchbotevent source
 */
const mixerEventSource = {
    id: "mixer",
    name: "Mixer",
    description: "Events like Follow, Host, Subscribe and more from Mixer",
    events: [
        {
            id: "subscribed",
            name: "Subscribed",
            description: "When someone initially subscribes to your channel.",
            cached: false,
            manualMetadata: {
                username: "Twitchbot",
                totalMonths: 0
            }
        },
        {
            id: "resub",
            name: "Resubscribed",
            description: "When someone resubscribes to your channel.",
            cached: false,
            manualMetadata: {
                username: "Twitchbot",
                totalMonths: 6,
                currentStreak: 3,
                shared: true
            }
        },
        {
            id: "hosted",
            name: "Hosted",
            description: "When someone hosts your channel.",
            cached: true,
            queued: false,
            cacheMetaKey: "username",
            manualMetadata: {
                username: "Twitchbot",
                viewerCount: 5
            }
        },
        {
            id: "followed",
            name: "Followed",
            description: "When someone follows your channel.",
            cached: true,
            queued: false,
            cacheMetaKey: "username",
            manualMetadata: {
                username: "Twitchbot",
                userId: 0
            }
        },
        {
            id: "chat-message",
            name: "Chat Message",
            description: "When someone chats in your channel",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "viewer-arrived",
            name: "Viewer Arrived",
            description: "When someone actively joins your stream. Triggers on first chat message (cached).",
            cached: true,
            queued: false,
            cacheMetaKey: "username",
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "user-joined-chat",
            name: "User Joined Chat",
            description: "When someone joins your channel's chat",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "user-left-chat",
            name: "User Left Chat",
            description: "When someone leaves your channel's chat",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "user-joined-mixplay",
            name: "User Joined MixPlay",
            description: "When someone joins your channel's MixPlay session",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "poll-started",
            name: "Poll Started",
            description: "When a poll is started",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "poll-update",
            name: "Poll Update",
            description: "When Twitchbot recieves an update to an active poll",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "poll-ended",
            name: "Poll Ended",
            description: "When a poll has ended",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "message-deleted",
            name: "Message Deleted",
            description: "When a message is deleted",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "messages-purged",
            name: "User Timeout",
            description: "When a user is timed out",
            cached: false,
            queued: false,
            manualMetadata: {
                moderator: "Twitchbot",
                timeoutDuration: "1m"
            }
        },
        {
            id: "chat-cleared",
            name: "Chat Cleared",
            description: "When your channel's chat is cleared",
            cached: false,
            queued: false
        },
        {
            id: "user-banned",
            name: "User Banned",
            description: "When a user is banned from chat.",
            cached: false,
            queued: false,
            manualMetadata: {
                moderator: "Twitchbot"
            }
        },
        {
            id: "skill",
            name: "Skill Used",
            description: "When viewer uses a Mixer Skill (Sticker, Effect, etc).",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "patronage-milestone",
            name: "Spark Patronage Milestone",
            description: "When the channel reaches a spark patronage milestone",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot"
            }
        },
        {
            id: "subscription-gifted",
            name: "Subscription Gifted",
            description: "When someone gifts a subscription to someone else",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot",
                giftReceiverUser: "Matt"
            }
        },
        {
            id: "progression-levelup",
            name: "Progression Level Up",
            description: "When a viewer levels up to a new rank in your channel",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot",
                rankBadgeUrl: "https://static.mixer.com/img/design/ui/fan-progression/v1_badges/silver/large.gif",
                userLevel: 2,
                userTotalHearts: 120,
                userNextLevelXp: 250
            }
        },
        {
            id: "ad-break",
            name: "Ad-Break Triggered",
            description: "When an ad-break is triggered on your channel",
            cached: false,
            queued: false,
            manualMetadata: {
                username: "Twitchbot",
                maxAdBreakLengthInSec: 30
            }
        },
        {
            id: "stream-went-live",
            name: "Stream Went Live",
            description: "When you go live (Sometimes takes a few secs to trigger).",
            cached: true,
            cacheTtlInSecs: 30,
            manualMetadata: {}
        },
        {
            id: "stream-gone-offline",
            name: "Stream Went Offline",
            description: "When your stream has gone offline.",
            cached: true,
            cacheTtlInSecs: 30,
            manualMetadata: {}
        },
        {
            id: "stream-title-changed",
            name: "Stream Title Changed",
            description: "When your streams title has been changed",
            manualMetadata: {}
        },
        {
            id: "stream-game-changed",
            name: "Stream Game Changed",
            description: "When your streams game has been changed",
            manualMetadata: {}
        },
        {
            id: "stream-audience-changed",
            name: "Stream Audience Changed",
            description: "When your streams audience level has been changed",
            manualMetadata: {}
        }
    ]
};

module.exports = mixerEventSource;
