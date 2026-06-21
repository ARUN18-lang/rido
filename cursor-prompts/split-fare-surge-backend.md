You are a senior backend engineer extending an existing production 
monolith called "Rido" (Node.js + Express + PostgreSQL/PostGIS + 
Redis + BullMQ — already built in this codebase). 

Build a DYNAMIC PRICING AND SURGE ENGINE that replaces the current 
dummy fare logic. This must be modular, independently testable via 
Postman, and fully covered with edge cases. Do not write placeholder 
logic anywhere — every formula must be the real, working calculation.

---

## CONTEXT: EXISTING SYSTEM

The codebase already has:
- src/modules/fare/ (fare.service.js, fare.controller.js, 
  fare.schema.js) — currently has dummy/placeholder pricing logic 
  to be REPLACED
- src/config/maps.js — Google Maps client already configured
- Redis (ioredis) already configured at src/config/redis.js
- BullMQ queues already configured at src/queues/
- Prisma schema with VehicleFareConfig, Zone models already 
  defined — EXTEND these, don't replace

---

## PART 1 — DATABASE SCHEMA ADDITIONS (Prisma)

Add these models to prisma/schema.prisma:

### PoolRevenueMultiplier
id, vehicle_type (enum), passenger_count (Int),

revenue_multiplier (Decimal, e.g. 1.20),

discount_percent (Decimal, computed/stored for display),

is_active, updated_at

Unique constraint on [vehicle_type, passenger_count]
Seed this with the full matrix for EVERY vehicle type up to its 
max capacity (not just n=2,3):
- BIKE_TAXI: max 1 passenger (no sharing — solo only, exclude 
  from this table or set n=1, M=1.0)
- AUTO: n=2 → M=1.20, n=3 → M=1.50
- MINI_CAR/SEDAN: n=2 → M=1.20, n=3 → M=1.45, n=4 → M=1.65
- SUV: n=2 → M=1.15, n=3 → M=1.40, n=4 → M=1.60, n=5 → M=1.75, 
  n=6 → M=1.85
- TEMPO: n=2 through n=8, scale similarly with diminishing 
  per-step increase (use a formula: M_n = 1 + (n-1) × 0.18 × 
  (1 - (n-1)×0.04), capped at reasonable max, then round to 
  2 decimals — generate the seed programmatically, don't 
  hand-type 8 rows)

### VehicleFareConfig (EXTEND existing model)
Add fields if not present: base_fare, per_km_rate, 
per_min_rate, min_fare, max_surge_multiplier (per vehicle 
type — e.g. bike caps lower than cab), detour_rate_per_km, 
detour_rate_per_min, waiting_charge_per_min (after 2 min 
free wait at each stop)

### SurgeZoneSnapshot (new — stores computed surge per zone, 
audit trail)
id, zone_id, demand_count, supply_count, demand_supply_ratio,

weather_severity, traffic_congestion_index, event_boost,

surge_score, surge_multiplier, computed_at
This is an append-only log — every surge recomputation writes 
a row. Used for debugging "why was surge 1.8x at 6pm Tuesday" 
and for tuning weights later.

### EventBoostConfig (new)
id, zone_id, event_name, event_type (SPORTS/CONCERT/FESTIVAL/

RELIGIOUS/OTHER), starts_at, ends_at, boost_peak_value

(0.0-1.0), decay_minutes (how long after ends_at the boost

decays to 0), is_active, created_by (admin user id),

created_at

### RidePoolFareBreakdown (new — replaces/extends 
PoolFareAllocation from earlier)
id, ride_id (unique), pool_id, vehicle_type, passenger_count,

solo_base_fare, surge_multiplier, revenue_multiplier_applied,

total_pool_fare, raw_per_rider_share, detour_distance_km,

detour_duration_min, detour_buffer_amount, final_fare

(after cap), was_capped_to_solo (Boolean), created_at
This breakdown must be stored for EVERY ride so support/admin 
can explain any fare to a rider who disputes it.

---

## PART 2 — MODULE: ROUTE ENGINE (src/modules/routing/)

### routing.service.js

**getRoute({ originLat, originLng, destLat, destLng, 
waypoints? })**
- Calls Google Directions API with `departure_time=now` to get 
  TRAFFIC-AWARE duration (duration_in_traffic field, not just 
  duration)
- Returns: { distance_km, duration_min, duration_in_traffic_min, 
  polyline, congestion_ratio }
  - congestion_ratio = duration_in_traffic_min / duration_min 
    (1.0 = no traffic, 2.0 = double the free-flow time)
- CACHE in Redis: key `route:{origin_geohash}:{dest_geohash}`, 
  TTL 3 minutes (traffic changes fast, don't cache too long)
- Geohash the lat/lng to ~150m precision for cache key so 
  nearby-identical requests hit cache

**getMultiStopRoute({ stops: [{lat,lng}], finalDestination })**
- For pooled rides: calls Directions API with waypoints 
  parameter, optimize:true to get best stop order
- Returns combined route + per-leg distance/duration breakdown 
  (needed for detour calculation)

**EDGE CASES TO HANDLE:**
- Google API timeout (>3s) → fallback to Haversine distance × 
  1.3 (road distance correction factor) and a default duration 
  estimate based on average city speed (20 km/h), log a warning, 
  flag the ride record with `route_source: 'fallback'`
- Google API returns ZERO_RESULTS → reject with clear error, 
  don't silently use bad data
- Google API rate limit hit → use cached route if available 
  even if stale (better than failing), else fallback calc
- Waypoint optimization changes stop order → must re-map which 
  rider is "stop 1" vs "stop 2" and update their individual 
  detour calculations accordingly

---

## PART 3 — MODULE: SURGE ENGINE (src/modules/surge/)

### surge.service.js

**computeSurgeForZone(zoneId)** — the core function, called by 
a scheduled worker every 60 seconds per active zone:

demandCount = count of Ride records with status SEARCHING

or POOL_MATCHING created in this zone in the last 5 minutes

(query via PostGIS ST_Contains on pickup_geom)
supplyCount = count of ONLINE drivers currently in zone

(query Redis GEOSEARCH on rapido:drivers:online within

zone polygon — approximate with bounding box + PostGIS

refine, or maintain a Redis zone-driver-count via geo-fencing

on location update)
demandSupplyRatio = demandCount / max(supplyCount, 1)

normalize to 0-1 score:

ratioScore = clamp((demandSupplyRatio - 1) / 3, 0, 1)

// ratio of 1.0 (balanced) = 0 score, ratio of 4.0 = max score
weatherSeverity = fetchWeatherSeverity(zone.centroid_lat,

zone.centroid_lng)

→ calls weather API (OpenWeatherMap), cached 15 min per zone

→ maps weather condition to 0-1: clear=0, light rain=0.3,

heavy rain=0.7, storm=1.0; also factor in extreme heat

(>40°C = 0.3 boost, since fewer two-wheeler/walk-up demand

shifts to auto/cab)
trafficCongestionIndex = average congestion_ratio from

recent routes computed in this zone (last 10 min, from

Redis-cached route lookups) normalized to 0-1:

ratio of 1.0-1.2 = 0, ratio of 2.0+ = 1.0
eventBoost = queryActiveEventBoosts(zoneId, now)

→ check EventBoostConfig for events where now is between

starts_at and (ends_at + decay_minutes)

→ if now < ends_at: boost = boost_peak_value

→ if now > ends_at: boost = boost_peak_value ×

(1 - (now - ends_at) / decay_minutes), floor at 0

→ if multiple events active in zone, take the MAX boost

(don't stack)
surgeScore = (W1 × ratioScore) + (W2 × weatherSeverity) +

(W3 × trafficCongestionIndex) + (W4 × eventBoost)

Default weights (configurable via env or admin):

W1=0.45, W2=0.20, W3=0.20, W4=0.15
ACTIVATION THRESHOLD:

if surgeScore < 0.15: surge_multiplier = 1.0 (no surge)

else: surge_multiplier = 1.0 + (surgeScore ×

(zone.vehicleType.max_surge_multiplier - 1.0))
Round to nearest 0.05 (e.g. 1.42 → 1.40) — avoids showing

riders oddly-precise numbers like "1.4237x"
Cap at vehicle type's max_surge_multiplier (from

VehicleFareConfig — bikes might cap at 1.8x, cabs at 2.5x)
Write SurgeZoneSnapshot row (audit trail)
Cache result in Redis:

key surge:{zoneId}:{vehicleType}, TTL 90 seconds


**getSurgeMultiplier(zoneId, vehicleType)** — read-path, called 
on every fare quote:
- Read from Redis cache first
- If cache miss (expired): trigger synchronous 
  computeSurgeForZone() (don't block too long — 2s timeout, 
  fallback to 1.0 if it can't compute in time)

### surge.worker.js
- BullMQ repeatable job, runs every 60 seconds
- Loops all active zones, calls computeSurgeForZone for each
- Use Promise.allSettled so one zone's failure doesn't block 
  others
- Log each zone's computed surge to Winston for monitoring

### weather.service.js
- fetchWeatherSeverity(lat, lng) using OpenWeatherMap API 
  (or similar)
- Cache per zone centroid, 15 min TTL
- EDGE CASE: API failure → return 0 (no weather boost) rather 
  than blocking fare calculation, log warning

### EDGE CASES — SURGE ENGINE
- Zone has zero drivers online → demandSupplyRatio would be 
  infinite; cap supplyCount at minimum 1 for the division, 
  but also: if supplyCount === 0, set a flag 
  `no_drivers_available` and surface "no drivers nearby" to 
  rider instead of just showing high surge
- Sudden demand spike from a single bad actor (one user 
  spamming ride requests) → demandCount should count DISTINCT 
  users, not raw ride request rows, to prevent gaming
- Event boost configured but event running late/early → admin 
  can manually override/extend an EventBoostConfig's ends_at 
  via PATCH endpoint without code deploy
- Two overlapping events in the same zone → take MAX boost, 
  documented above, never stack additively (would create 
  absurd surge)
- Surge oscillating rapidly (zone hovering right at threshold, 
  flickering between 1.0x and 1.1x every cycle) → apply 
  smoothing: new_multiplier = (0.7 × previous_multiplier) + 
  (0.3 × computed_multiplier) — exponential moving average 
  to prevent jitter
- Weather API and Maps API both down simultaneously → fare 
  still computes using base + distance + time only, surge 
  forced to 1.0, log a CRITICAL alert (Sentry) since this 
  means lost surge revenue but rides must still work

---


## PART 4 (REVISED) — MODULE: FARE ENGINE 
(src/modules/fare/ — REPLACE existing dummy logic)

DESIGN NOTE FOR THE AGENT: This pooling model only matches 
riders whose pickup point lies ON the existing route polyline 
of an already-matched trip (within a tight tolerance — see 
pooling.service matching logic, ROUTE_ONLY_TOLERANCE_METERS 
below). The driver never leaves the route to detour for a 
pickup. Because of this constraint, distance-based detour 
charging is NOT used. The only extra costs from adding a 
passenger are: (a) brief stop-and-go time at each additional 
pickup, and (b) waiting time if a rider isn't ready when the 
driver arrives. Do not implement distance-based detour 
charging — implement the simpler per-stop + waiting model 
below instead.

### fare.calculator.js — full rewrite

**computeSoloFare({ vehicleType, distanceKm, durationMin, 
surgeMultiplier })**
config = getVehicleFareConfig(vehicleType)  // from DB,

cached in Redis 5 min TTL

distanceCharge = config.per_km_rate × distanceKm

timeCharge = config.per_min_rate × durationMin

preSurgeFare = config.base_fare + distanceCharge + timeCharge

preSurgeFare = max(preSurgeFare, config.min_fare)

surgedFare = preSurgeFare × surgeMultiplier

return {

baseFare: config.base_fare,

distanceCharge, timeCharge, preSurgeFare,

surgeMultiplier, surgedFare,

total: round(surgedFare, 2)

}

**computePoolFareSplit({ vehicleType, passengerRides, 
combinedRoute, surgeMultiplier })**

passengerRides = array of { rideId, riderId, 
individualDistanceKm, individualDurationMin, 
soloFareIfAlone, stopSequenceIndex, 
actualWaitMinutesAtPickup }

combinedRoute = the multi-stop route from routing.service — 
since all pickups lie on the original polyline, this route's 
total distance should be ≈ the longest individual rider's 
distance, plus a small allowance for stop-and-go (NOT a full 
re-route)

n = passengerRides.length
M_n = getRevenueMultiplier(vehicleType, n)

// from PoolRevenueMultiplier table; if n exceeds vehicle

// max capacity, THROW error — should never happen if

// pooling.service enforces capacity correctly upstream
anchorRider = the rider with the LONGEST

individualDistanceKm in the pool

// this represents the trip the driver was already going

// to make — the "spine" of the route that other riders

// are joining

soloEquivalentFare = computeSoloFare using

anchorRider.individualDistanceKm and

anchorRider.individualDurationMin
totalPoolFare = soloEquivalentFare.surgedFare × M_n
FOR EACH rider:

a. theirShareOfDistance = individualDistanceKm /

sum(all individualDistanceKm)

// proportional allocation — someone going 8km in a

// 10km pooled trip pays more than someone going 2km
b. rawShare = totalPoolFare × theirShareOfDistance
c. stopCharge = (stopSequenceIndex > 0)

? config.per_stop_charge

: 0

// flat charge per ADDITIONAL pickup beyond the first

// (covers brief stop-and-go time/fuel, not distance).

// The first rider picked up (stopSequenceIndex 0)

// never pays this — they're the "anchor" stop, no

// extra time was added for them.
d. waitingCharge = max(0, actualWaitMinutesAtPickup -

config.free_wait_minutes_per_stop) ×

config.waiting_charge_per_min

// only charges if the RIDER made the driver wait

// beyond the free grace window — this is a

// rider-behavior charge, not a structural pooling cost
e. finalFare = rawShare + stopCharge + waitingCharge
f. CAP: if finalFare > rider.soloFareIfAlone:

finalFare = rider.soloFareIfAlone, set

was_capped_to_solo = true

// CRITICAL: log this — if capping happens often for

// a vehicle type, M_n or per_stop_charge is mis-tuned
Store full RidePoolFareBreakdown row for audit, including

stopCharge and waitingCharge as separate line items so

support can explain any fare to a disputing rider
Verify: if a cap triggered for any rider, the "lost"

revenue is absorbed by the platform, NOT redistributed to

other riders — never silently raise someone else's fare

to compensate after they've already been quoted


**EDGE CASES — FARE SPLITTER:**
- Only 1 rider ever joins pool window (no match found) → 
  fall back entirely to computeSoloFare, no M_n applied
- All riders have identical pickup AND drop (perfect overlap) 
  → stopCharge applies normally per additional stop, but 
  theirShareOfDistance will be equal for all, producing a 
  clean even split
- Rider's individual distance is 0 or negative (data error) → 
  reject the calculation, throw ValidationError, alert — 
  never silently produce a fare with bad inputs
- M_n lookup misses (vehicle type + passenger count combo not 
  seeded) → fail loudly (500 + Sentry alert), never default 
  to M_n=1.0 silently, since that would under-charge
- A candidate rider's pickup is NOT actually on the anchor 
  route within ROUTE_ONLY_TOLERANCE_METERS → this should be 
  rejected upstream in pooling.service's matching logic 
  before it ever reaches the fare calculator; fare.calculator 
  should still defensively validate this and throw if a 
  pool is passed in with an off-route pickup, rather than 
  silently computing a fare for an invalid match
- stopCharge + waitingCharge alone (before rawShare is even 
  added) exceeds the rider's solo fare → cap still applies 
  (rule 5f covers this), and this combination should trigger 
  a warning log since it suggests per_stop_charge or 
  waiting_charge_per_min may be set too high relative to 
  typical short-hop solo fares
- Rider cancels after being matched but before pickup → 
  remaining riders' fares must be recomputed with the reduced 
  n (re-run steps 1–7 with the smaller passengerRides array); 
  notify affected riders of the fare change before charging
And the corresponding Part 7 config change — remove the distance-based detour keys, replace with:
DEFAULT_PER_STOP_CHARGE=8
DEFAULT_WAITING_CHARGE_PER_MIN=2
FREE_WAIT_MINUTES_PER_STOP=2
ROUTE_ONLY_TOLERANCE_METERS=150
(ROUTE_ONLY_TOLERANCE_METERS is the new key — this is the tolerance your pooling-match logic uses to decide "is this candidate's pickup actually on the existing route," which is the constraint making this whole simplification valid. Worth flagging to your coding agent that this value directly controls how strict vs. lenient your "no real detour" promise is — too loose, and you're back to silent detours; too tight, and you'll rarely find matches.)


## PART 5 — API ENDPOINTS (Postman-testable)

All under /api/v1/fare and /api/v1/admin/pricing

### POST /api/v1/fare/estimate
Body: { pickup_lat, pickup_lng, drop_lat, drop_lng, 
vehicle_type, ride_type }
Returns BOTH solo and shared estimates side by side:
```json
{
  "success": true,
  "data": {
    "distance_km": 10.2,
    "duration_min": 25,
    "duration_in_traffic_min": 31,
    "zone": { "id": "...", "name": "Anna Nagar Zone" },
    "surge": { "multiplier": 1.5, "reason": "high_demand" },
    "solo": {
      "total": 253.13,
      "breakdown": { "base": 30, "distance": 122.4, 
        "time": 18.75, "surge_addon": 84.38 }
    },
    "shared_estimate": {
      "2_riders": { "per_rider": 151.50, "savings_percent": 40 },
      "3_riders": { "per_rider": 126.00, "savings_percent": 50 }
    }
  }
}
```

### GET /api/v1/admin/pricing/surge/:zoneId — current surge 
debug view (shows full SurgeZoneSnapshot breakdown — demand, 
supply, weather, traffic, event contributions separately, so 
you can see WHY surge is what it is)

### GET /api/v1/admin/pricing/surge/:zoneId/history — last 24h 
of SurgeZoneSnapshot rows, for graphing

### PATCH /api/v1/admin/pricing/vehicle-config/:vehicleType — 
update base_fare, per_km_rate, etc. (admin only)

### POST /api/v1/admin/pricing/revenue-multiplier — 
create/update M_n for a vehicle_type + passenger_count combo

### POST /api/v1/admin/pricing/events — create EventBoostConfig

### PATCH /api/v1/admin/pricing/events/:id — extend/modify 
active event (e.g., match running into extra time)

### GET /api/v1/admin/pricing/simulate — TESTING ENDPOINT, 
takes { vehicle_type, distance_km, duration_min, 
passenger_count, surge_multiplier } as raw inputs (bypassing 
Google Maps and live surge) and returns the fare calculation 
— THIS IS FOR YOUR POSTMAN TESTING, lets you test the math 
in isolation without needing real GPS coordinates or live 
traffic data

---

## PART 6 — TESTING REQUIREMENTS

Write Jest unit tests for:
- fare.calculator.test.js: every formula in Part 4, including 
  every edge case listed (capping, zero detour, missing M_n, 
  negative detour, single-rider fallback)
- surge.service.test.js: threshold activation/deactivation, 
  smoothing/EMA behavior, event boost decay curve, zero-driver 
  edge case, overlapping events taking MAX not SUM

Provide a Postman collection (export as JSON file) covering:
- Fare estimate for each vehicle type, solo and shared
- Admin simulate endpoint with the EXACT numbers from this 
  prompt's pricing table (10km/25min, verify Auto solo = 
  ₹168.75, Cab solo = ₹231.25, etc.) as regression tests
- Surge debug endpoint
- Event creation and its effect on a subsequent fare estimate

---

## PART 7 — CONFIGURATION (add to .env.example)
OPENWEATHER_API_KEY=

SURGE_RECOMPUTE_INTERVAL_SECONDS=60

SURGE_ACTIVATION_THRESHOLD=0.15

SURGE_WEIGHT_DEMAND_SUPPLY=0.45

SURGE_WEIGHT_WEATHER=0.20

SURGE_WEIGHT_TRAFFIC=0.20

SURGE_WEIGHT_EVENT=0.15

SURGE_EMA_SMOOTHING_FACTOR=0.3

ROUTE_CACHE_TTL_SECONDS=180

SURGE_CACHE_TTL_SECONDS=90

WEATHER_CACHE_TTL_SECONDS=900

DEFAULT_DETOUR_RATE_PER_KM=8

DEFAULT_WAITING_CHARGE_PER_MIN=2

FREE_WAIT_MINUTES_PER_STOP=2

---

## DELIVERABLES — IN ORDER

1. Prisma schema additions (Part 1) + migration
2. Seed script for PoolRevenueMultiplier (programmatic 
   generation per vehicle type, not hand-typed)
3. src/modules/routing/ (Part 2) — complete with caching 
   and fallback
4. src/modules/surge/ (Part 3) — service + worker + 
   weather.service.js
5. src/modules/fare/fare.calculator.js — full rewrite (Part 4)
6. API endpoints (Part 5) — controllers, routes, schemas 
   (Zod validation)
7. Jest tests (Part 6)
8. Postman collection JSON export
9. Update .env.example (Part 7)

No placeholder logic anywhere. Every formula must be the 
real, working calculation matching the worked examples in 
this prompt EXACTLY — use the Postman regression tests to 
self-verify before considering the task complete.
