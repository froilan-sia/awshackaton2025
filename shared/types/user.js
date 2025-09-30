"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherPreference = exports.ActivityLevel = exports.GroupType = exports.BudgetRange = void 0;
var BudgetRange;
(function (BudgetRange) {
    BudgetRange["LOW"] = "low";
    BudgetRange["MEDIUM"] = "medium";
    BudgetRange["HIGH"] = "high";
    BudgetRange["LUXURY"] = "luxury";
})(BudgetRange || (exports.BudgetRange = BudgetRange = {}));
var GroupType;
(function (GroupType) {
    GroupType["SOLO"] = "solo";
    GroupType["COUPLE"] = "couple";
    GroupType["FAMILY"] = "family";
    GroupType["FRIENDS"] = "friends";
    GroupType["BUSINESS"] = "business";
})(GroupType || (exports.GroupType = GroupType = {}));
var ActivityLevel;
(function (ActivityLevel) {
    ActivityLevel["LOW"] = "low";
    ActivityLevel["MODERATE"] = "moderate";
    ActivityLevel["HIGH"] = "high";
    ActivityLevel["EXTREME"] = "extreme";
})(ActivityLevel || (exports.ActivityLevel = ActivityLevel = {}));
var WeatherPreference;
(function (WeatherPreference) {
    WeatherPreference["INDOOR_PREFERRED"] = "indoor_preferred";
    WeatherPreference["OUTDOOR_PREFERRED"] = "outdoor_preferred";
    WeatherPreference["WEATHER_FLEXIBLE"] = "weather_flexible";
})(WeatherPreference || (exports.WeatherPreference = WeatherPreference = {}));
//# sourceMappingURL=user.js.map