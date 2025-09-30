"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationStatus = exports.TransportType = exports.CrowdLevel = exports.CulturalCategory = exports.WeatherImpact = exports.WeatherCondition = exports.Priority = exports.ConsiderationCategory = exports.ContextType = exports.ItemType = exports.RecommendationType = void 0;
var RecommendationType;
(function (RecommendationType) {
    RecommendationType["ATTRACTION"] = "attraction";
    RecommendationType["RESTAURANT"] = "restaurant";
    RecommendationType["EVENT"] = "event";
    RecommendationType["ITINERARY"] = "itinerary";
    RecommendationType["ACTIVITY"] = "activity";
    RecommendationType["EXPERIENCE"] = "experience";
    RecommendationType["SHOPPING"] = "shopping";
    RecommendationType["NIGHTLIFE"] = "nightlife";
})(RecommendationType || (exports.RecommendationType = RecommendationType = {}));
var ItemType;
(function (ItemType) {
    ItemType["ATTRACTION"] = "attraction";
    ItemType["RESTAURANT"] = "restaurant";
    ItemType["EVENT"] = "event";
    ItemType["ACTIVITY"] = "activity";
    ItemType["SHOP"] = "shop";
    ItemType["ACCOMMODATION"] = "accommodation";
})(ItemType || (exports.ItemType = ItemType = {}));
var ContextType;
(function (ContextType) {
    ContextType["WEATHER"] = "weather";
    ContextType["CROWD"] = "crowd";
    ContextType["TIME"] = "time";
    ContextType["LOCATION"] = "location";
    ContextType["SEASON"] = "season";
    ContextType["USER_HISTORY"] = "user_history";
    ContextType["SOCIAL_TRENDS"] = "social_trends";
})(ContextType || (exports.ContextType = ContextType = {}));
var ConsiderationCategory;
(function (ConsiderationCategory) {
    ConsiderationCategory["WEATHER"] = "weather";
    ConsiderationCategory["CROWD"] = "crowd";
    ConsiderationCategory["CULTURAL"] = "cultural";
    ConsiderationCategory["SAFETY"] = "safety";
    ConsiderationCategory["ACCESSIBILITY"] = "accessibility";
    ConsiderationCategory["BUDGET"] = "budget";
    ConsiderationCategory["TIME"] = "time";
    ConsiderationCategory["TRANSPORT"] = "transport";
})(ConsiderationCategory || (exports.ConsiderationCategory = ConsiderationCategory = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
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
var WeatherImpact;
(function (WeatherImpact) {
    WeatherImpact["POSITIVE"] = "positive";
    WeatherImpact["NEUTRAL"] = "neutral";
    WeatherImpact["NEGATIVE"] = "negative";
    WeatherImpact["BLOCKING"] = "blocking";
})(WeatherImpact || (exports.WeatherImpact = WeatherImpact = {}));
var CulturalCategory;
(function (CulturalCategory) {
    CulturalCategory["ETIQUETTE"] = "etiquette";
    CulturalCategory["CUSTOMS"] = "customs";
    CulturalCategory["LANGUAGE"] = "language";
    CulturalCategory["BEHAVIOR"] = "behavior";
    CulturalCategory["DRESS"] = "dress";
    CulturalCategory["DINING"] = "dining";
    CulturalCategory["RELIGIOUS"] = "religious";
})(CulturalCategory || (exports.CulturalCategory = CulturalCategory = {}));
var CrowdLevel;
(function (CrowdLevel) {
    CrowdLevel["VERY_LOW"] = "very_low";
    CrowdLevel["LOW"] = "low";
    CrowdLevel["MODERATE"] = "moderate";
    CrowdLevel["HIGH"] = "high";
    CrowdLevel["VERY_HIGH"] = "very_high";
})(CrowdLevel || (exports.CrowdLevel = CrowdLevel = {}));
var TransportType;
(function (TransportType) {
    TransportType["MTR"] = "mtr";
    TransportType["BUS"] = "bus";
    TransportType["TRAM"] = "tram";
    TransportType["FERRY"] = "ferry";
    TransportType["TAXI"] = "taxi";
    TransportType["WALKING"] = "walking";
    TransportType["UBER"] = "uber";
})(TransportType || (exports.TransportType = TransportType = {}));
var RecommendationStatus;
(function (RecommendationStatus) {
    RecommendationStatus["ACTIVE"] = "active";
    RecommendationStatus["EXPIRED"] = "expired";
    RecommendationStatus["DISMISSED"] = "dismissed";
    RecommendationStatus["COMPLETED"] = "completed";
})(RecommendationStatus || (exports.RecommendationStatus = RecommendationStatus = {}));
//# sourceMappingURL=recommendation.js.map