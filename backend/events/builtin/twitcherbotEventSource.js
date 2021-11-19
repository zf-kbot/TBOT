"use strict";

/**
 * The twitchbotevent source
 */
const twitcherbotEventSource = {
    id: "twitcherbot",
    name: "Twitchbot",
    description: "Various events that can happen within Twitchbot.",
    events: [
        {
            id: "chat-connected",
            name: "Twitch Connected",
            description: "When Twitchbot connects to Twitch.",
            cached: false,
            manualMetadata: {
                username: "Twitchbot"
            },
            activityFeed: {
                icon: "fad fa-plug",
                getMessage: () => {
                    return `Connected to Twitch`;
                }
            }
        },
        {
            id: "view-time-update",
            name: "View Time Update",
            description: "When a viewer's view time updates automatically.",
            cached: false,
            manualMetadata: {
                previousViewTime: 1,
                newViewTime: 2
            }
        },
        {
            id: "twitcherbot-started",
            name: "Twitchbot Started",
            description: "When Twitchbot has started running.",
            cached: false
        },
        {
            id: "custom-variable-expired",
            name: "Custom Variable Expired",
            description: "When a custom variable expires",
            cached: false
        },
        {
            id: "custom-variable-set",
            name: "Custom Variable Created",
            description: "When a custom variable gets created",
            cached: false
        },
        {
            id: "highlight-message",
            name: "Chat Message Highlight",
            description: "When you select to highlight a message on your overlay.",
            cached: false,
            manualMetadata: {
                username: "Twitchbot",
                messageText: "Test message"
            }
        }
    ]
};

module.exports = twitcherbotEventSource;
