"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportType = exports.AgeGroup = exports.OrganizerType = exports.EventCategory = exports.EventSource = void 0;
var EventSource;
(function (EventSource) {
    EventSource["HKTB"] = "hktb";
    EventSource["MALL"] = "mall";
    EventSource["COMMUNITY"] = "community";
    EventSource["GOVERNMENT"] = "government";
    EventSource["PRIVATE"] = "private";
    EventSource["CULTURAL_INSTITUTION"] = "cultural_institution";
})(EventSource || (exports.EventSource = EventSource = {}));
var EventCategory;
(function (EventCategory) {
    EventCategory["CULTURAL"] = "cultural";
    EventCategory["ENTERTAINMENT"] = "entertainment";
    EventCategory["FOOD_DRINK"] = "food_drink";
    EventCategory["SPORTS"] = "sports";
    EventCategory["EDUCATION"] = "education";
    EventCategory["FAMILY"] = "family";
    EventCategory["BUSINESS"] = "business";
    EventCategory["FESTIVAL"] = "festival";
    EventCategory["EXHIBITION"] = "exhibition";
    EventCategory["PERFORMANCE"] = "performance";
    EventCategory["WORKSHOP"] = "workshop";
    EventCategory["SEASONAL"] = "seasonal";
})(EventCategory || (exports.EventCategory = EventCategory = {}));
var OrganizerType;
(function (OrganizerType) {
    OrganizerType["GOVERNMENT"] = "government";
    OrganizerType["PRIVATE_COMPANY"] = "private_company";
    OrganizerType["NON_PROFIT"] = "non_profit";
    OrganizerType["CULTURAL_INSTITUTION"] = "cultural_institution";
    OrganizerType["MALL"] = "mall";
    OrganizerType["COMMUNITY_GROUP"] = "community_group";
})(OrganizerType || (exports.OrganizerType = OrganizerType = {}));
var AgeGroup;
(function (AgeGroup) {
    AgeGroup["CHILD"] = "child";
    AgeGroup["ADULT"] = "adult";
    AgeGroup["SENIOR"] = "senior";
    AgeGroup["STUDENT"] = "student";
})(AgeGroup || (exports.AgeGroup = AgeGroup = {}));
var TransportType;
(function (TransportType) {
    TransportType["MTR"] = "mtr";
    TransportType["BUS"] = "bus";
    TransportType["TRAM"] = "tram";
    TransportType["FERRY"] = "ferry";
    TransportType["TAXI"] = "taxi";
    TransportType["WALKING"] = "walking";
})(TransportType || (exports.TransportType = TransportType = {}));
//# sourceMappingURL=event.js.map