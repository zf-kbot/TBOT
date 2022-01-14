"use strict";

(function () {
    angular.module("twitcherbotApp").component("contact", {
        bindings: {},
        template: `
          <div class="contact-container" ng-repeat="contact in $ctrl.contacts" style="position: fixed; bottom: 25px; left: 25px">
            <a href="#" ng-click="contact.click(contact.href)">
              <i
                class="{{ contact.class }}"
                style="{{ contact.style }}"
                uib-tooltip="{{ contact.tooltip }}"
                tooltip-append-to-body="true"
              ></i>
            </a>
          </div>
        `,
        controller: function(logger) {
            logger.info("contact init...");
            let ctrl = this;
            const contacts = [
                {
                    href: "https://discord.com/invite/hsF7939YW6",
                    class: "fab fa-discord",
                    tooltip: "Discord",
                    style: "font-size: 23px; color: #fff",
                    click: function(href) {
                        shell.openExternal(href);
                    }
                }
            ];
            ctrl.contacts = contacts;
        }
    });
}());