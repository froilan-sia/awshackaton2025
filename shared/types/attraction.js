"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportType = exports.WarningSeverity = exports.WeatherCondition = exports.CrowdLevel = exports.Priority = exports.TipCategory = void 0;
var TipCategory;
(function (TipCategory) {
    TipCategory["SAFETY"] = "safety";
    TipCategory["ETIQUETTE"] = "etiquette";
    TipCategory["PREPARATION"] = "preparation";
    TipCategory["WEATHER"] = "weather";
    TipCategory["CULTURAL"] = "cultural";
    TipCategory["PRACTICAL"] = "practical";
})(TipCategory || (exports.TipCategory = TipCategory = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
var CrowdLevel;
(function (CrowdLevel) {
    CrowdLevel["VERY_LOW"] = "very_low";
    CrowdLevel["LOW"] = "low";
    CrowdLevel["MODERATE"] = "moderate";
    CrowdLevel["HIGH"] = "high";
    CrowdLevel["VERY_HIGH"] = "very_high";
})(CrowdLevel || (exports.CrowdLevel = CrowdLevel = {}));
var WeatherCondition;
(function (WeatherCondition) {
    WeatherCondition["SUNNY"] = "sunny";
    WeatherCondition["CLOUDY"] = "cloudy";
    WeatherCondition["RAINY"] = "rainy";
    WeatherCondition["STORMY"] = "stormy";
    WeatherCondition["HOT"] = "hot";
    WeatherCondition["HUMID"] = "humid";
    WeatherCondition["COOL"] = "cool";
    WeatherCondition["WINDY"] = "windy";
})(WeatherCondition || (exports.WeatherCondition = WeatherCondition = {}));
var WarningSeverity;
(function (WarningSeverity) {
    WarningSeverity["INFO"] = "info";
    WarningSeverity["WARNING"] = "warning";
    WarningSeverity["DANGER"] = "danger";
})(WarningSeverity || (exports.WarningSeverity = WarningSeverity = {}));
var TransportType;
(function (TransportType) {
    TransportType["MTR"] = "mtr";
    TransportType["BUS"] = "bus";
    TransportType["TRAM"] = "tram";
    TransportType["FERRY"] = "ferry";
    TransportType["TAXI"] = "taxi";
    TransportType["WALKING"] = "walking";
})(TransportType || (exports.TransportType = TransportType = {}));
//# sourceMappingURL=attraction.js.map