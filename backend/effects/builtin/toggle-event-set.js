"use strict";

const eventAccess = require("../../events/events-access");

const { ControlKind, InputEvent } = require('../../interactive/constants/MixplayConstants');
const effectModels = require("../models/effectModels");
const { EffectTrigger } = effectModels;

const { EffectCategory } = require('../../../shared/effect-constants');

const chat = {
    definition: {
        id: "twitcherbot:toggle-event-set",
        name: "Toggle Event Set",
        description: "Toggle an event sets active status",
        icon: "fa fa-toggle-off",
        categories: [EffectCategory.COMMON],
        dependencies: [],
        triggers: effectModels.buildEffectTriggersObject(
            [ControlKind.BUTTON, ControlKind.TEXTBOX],
            [InputEvent.MOUSEDOWN, InputEvent.KEYDOWN, InputEvent.SUBMIT],
            EffectTrigger.ALL
        )
    },
    globalSettings: {},
    optionsTemplate: `
        <eos-container>
            <p>This effect let's you automatically toggle the active status of Event Sets (which you can create in the Events tab).</p>
        </eos-container>

        <eos-container ng-hide="hasEventSets" pad-top="true">
            <span class="muted">No Event Sets created yet! You can create them in the <b>Events</b> tab.</span>
        </eos-container>

        <eos-container ng-show="hasEventSets" header="Event Set" pad-top="true">
            <dropdown-select options="eventSetOptions" selected="effect.selectedEventGroupId"></dropdown-select>
        </eos-container>

        <eos-container ng-show="hasEventSets" header="Toggle Action" pad-top="true">
            <dropdown-select options="toggleOptions" selected="effect.toggleType"></dropdown-select>
        </eos-container>
    `,
    optionsController: ($scope, eventsService) => {

        const eventGroups = eventsService.getEventGroups();

        $scope.eventSetOptions = {};

        for (const eventGroup of eventGroups) {
            $scope.eventSetOptions[eventGroup.id] = eventGroup.name;
        }

        $scope.hasEventSets = eventGroups != null && eventGroups.length > 0;

        if ($scope.eventSetOptions[$scope.effect.selectedEventGroupId] == null) {
            $scope.effect.selectedEventGroupId = undefined;
        }

        $scope.toggleOptions = {
            disable: "Deactivate",
            enable: "Activate"
        };

        if ($scope.effect.toggleType == null) {
            $scope.effect.toggleType = "disable";
        }
    },
    optionsValidator: effect => {
        let errors = [];
        if (effect.selectedEventGroupId == null) {
            errors.push("Please select an event set.");
        }
        return errors;
    },
    onTriggerEvent: async event => {
        const { effect } = event;

        eventAccess.updateEventGroupActiveStatus(effect.selectedEventGroupId, effect.toggleType === "enable");

        return true;
    }
};

module.exports = chat;
