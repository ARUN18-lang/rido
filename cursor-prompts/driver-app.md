You are a senior React Native engineer. Build a 
PRODUCTION-READY React Native (Expo SDK 51) Driver app 
for "Rido" — a ride-sharing platform in Tamil Nadu, India. 
Driver UX must be ultra-simple — drivers use this while 
driving; every critical action must be reachable in 1 tap. 
No small text. High contrast. Large touch targets (min 56px).

Same design system as Rider app (same theme/index.js).

---

## PROJECT STRUCTURE

rido-driver/
├── app.json
├── App.js
├── src/
│   ├── theme/index.js          # Same as rider app
│   ├── constants/
│   │   ├── api.js
│   │   └── ride.js
│   ├── store/
│   │   ├── authStore.js        # driver user + tokens
│   │   ├── rideStore.js        # active ride/pool state
│   │   └── earningsStore.js    # today's earnings cache
│   ├── services/
│   │   ├── api.js              # same interceptor pattern
│   │   ├── socket.js
│   │   └── locationTracker.js  # background GPS emitter
│   ├── navigation/
│   │   ├── index.js
│   │   ├── AuthNavigator.js
│   │   ├── KYCNavigator.js
│   │   └── MainNavigator.js
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SplashScreen.js
│   │   │   └── OTPScreen.js    # Same logic as rider
│   │   ├── kyc/
│   │   │   ├── KYCIntroScreen.js
│   │   │   ├── PersonalDetailsScreen.js
│   │   │   ├── DocumentUploadScreen.js
│   │   │   └── KYCPendingScreen.js
│   │   ├── main/
│   │   │   └── HomeScreen.js   # The online/offline hub
│   │   ├── ride/
│   │   │   ├── IncomingRideScreen.js
│   │   │   ├── RideActiveScreen.js
│   │   │   └── RideCompleteScreen.js
│   │   └── earnings/
│   │       └── EarningsScreen.js
│   └── components/
│       ├── ui/                 # Same Button, Card, etc.
│       ├── OnlineToggle.js
│       ├── RideRequestCard.js
│       ├── EarningsCard.js
│       └── WaypointList.js

---

## SCREENS

### SplashScreen.js
Same as rider but check:
- If not logged in → OTPScreen
- If logged in, KYC not approved → KYCPendingScreen
- If approved → HomeScreen
- If active ride in store → RideActiveScreen

### OTPScreen.js
Identical logic to rider. On verify:
- if is_new_user → KYCIntroScreen
- if returning driver with approved KYC → HomeScreen

### KYCIntroScreen.js
- "Let's get you set up" heading
- 4-step progress indicator 
  (Personal Details, Aadhaar, License, Vehicle)
- "Takes about 10 minutes" subtext
- List of what's needed (checklist style):
  ✓ Your Aadhaar card
  ✓ Driving license
  ✓ Vehicle RC book
  ✓ Vehicle insurance
- "Start KYC" primary button

### PersonalDetailsScreen.js
- Name, date of birth, gender (important for 
  Women's Ride eligibility)
- "Are you available for Women's Ride?" toggle
  (only shown if gender = FEMALE)
  Shows: "You'll need to upload female verification 
  document. Admin will verify within 24 hours."
- Form validation with react-hook-form + zod

### DocumentUploadScreen.js
4 upload cards in a stepper:
Each card:
- Document name (large, bold)
- Description of what to upload
- Upload button → expo-image-picker → 
  compress → upload to S3 via POST /drivers/documents
- After upload: show thumbnail + green checkmark
- Retry if failed

Documents: Aadhaar Front, Aadhaar Back, 
Driving License, Vehicle RC, Vehicle Insurance
After all uploaded: add vehicle details form
(make, model, year, color, registration number, 
vehicle type selector with capacity shown)

### KYCPendingScreen.js
- Clock illustration (use geometric SVG)
- "Documents under review" heading
- "Usually approved within 24 hours" subtext
- Estimated time chip: "Submitted 2 hours ago"
- What happens next: 3 bullet points
- "Notify me when approved" toggle 
  (enables push for KYC status)
- Support contact: WhatsApp button

### HomeScreen.js (THE CORE DRIVER SCREEN)
This is the driver's mission control. Must be 
perfectly functional.

Layout: full-screen map + bottom panel

Map (top 55% of screen):
- Driver's current location (blue dot, large)
- If ONLINE: show green pulsing ring around location
  ("You are discoverable to riders")
- Clean map style (same as rider)

Bottom Panel (fixed 45%):

OFFLINE STATE:
  Large centered toggle switch (80px diameter):
  Gray background, OFF label
  "You are offline" heading (24px bold)
  "Go online to start receiving rides"
  
  Today's summary (if any rides done):
  "₹0 earned · 0 trips today"
  
  "Go Online" button (full width, violet, 56px height)
  On tap: calls POST /drivers/me/status {ONLINE, lat, lng}
  Updates toggle to green with animation

ONLINE STATE:
  Toggle now green, "ONLINE" label
  Animated green pulse on toggle
  
  Earnings ticker: "₹340 today · 4 trips"
  
  Status card: "Waiting for rides..."
  Animated subtle wave/radar graphic in background
  
  Zone info: "You're in [Zone Name] · 1.2x surge 🔥"
  (if surge active, show orange badge)
  
  Women's Ride enabled badge if applicable (pink, 👩)
  
  "Go Offline" text button (smaller, bottom right)

RIDE INCOMING (overlays on top of online state):
  → Navigate to IncomingRideScreen

### IncomingRideScreen.js
This is CRITICAL. Driver sees this when a ride is 
offered. Must be IMPOSSIBLE TO MISS.

Full screen takeover with FCM wakelock:
- Phone vibrates + sound on arrival
- Orange/amber background (high visibility)

Content:
  "New Ride Request 🔔" (large, bold)
  
  Ride type badge:
    [Solo] gray  OR  [Shared 3 seats] violet  
    OR [Women's Ride] pink
  
  Fare (HUGE text, center): "₹148"
  If shared: "₹148 total · up to 3 passengers"
  
  Route card:
    📍 Pickup: "Anna Nagar, Madurai" — 1.2 km away
    🔴 Drop: "Bypass Road, Madurai" — 8.4 km total
  
  For POOLED rides — WaypointList component:
    Shows all pickup points in sequence:
    Stop 1: [Rider A name initial] — Anna Nagar (1.2km)
    Stop 2: [Rider B name initial] — KK Nagar (2.1km)
    Drop: Bypass Road
  
  Estimated duration: "~28 min"
  
  Countdown timer arc (circular progress, starts at 20s):
    Large number in center
    Arc depletes as time runs out
    Below 5s: arc turns red, phone vibrates again
  
  Two buttons (each 56px height, side by side):
    [✕ Decline]   [✓ Accept]
    Gray outline    Violet filled
  
  On Accept: 
    call driver:accept socket event
    Navigate to RideActiveScreen
  On Decline / timeout:
    call driver:decline
    Return to HomeScreen ONLINE state

### RideActiveScreen.js
Handles all states of an active ride.
For pooled rides: handles MULTIPLE passengers.

Top: Full-screen map showing:
  - Driver location (animated, auto-follows)
  - Current destination pin
  - Route polyline
  - For pooled: all remaining stops as numbered pins

State machine — show different UI per state:

STATE: HEADING_TO_PICKUP (or HEADING_TO_STOP_N for pooled)
  Bottom panel (280px):
    "Heading to pickup" / "Heading to Stop 2"
    
    [Passenger info row]: 
      Circle avatar (initial), First name only, 
      ⭐ rating
    
    Address: full pickup address
    Distance + ETA: "1.2 km · 4 min"
    
    Action row:
      [📞 Call Rider] — masked number proxy
      [Navigate] — opens Google Maps with address
    
    Large button: "I've Arrived" (56px, full width, violet)
    On tap: emit driver:arrived, update status

STATE: ARRIVED_AT_PICKUP
  Bottom panel:
    "You've arrived!" (green banner at top of panel)
    
    OTP Section (prominent):
    "Ask rider for OTP"
    
    4-box OTP input (large boxes, 64px each)
    Auto-submit on 4th digit
    On submit: emit driver:start_ride { ride_id, otp }
    On wrong OTP: shake animation, "Wrong OTP. Try again."
    After 3 wrong: show "Ask rider to check their app"
    
    "Running late? Call rider" text link

  For POOLED rides: if more pickups remain after this:
    Panel shows: "After pickup, head to Stop 2"
    Next stop preview

STATE: RIDE_IN_PROGRESS
  Bottom panel (compact, 160px — driver needs map space):
    Compact trip row: "🔴 → 📍 8.4 km remaining"
    All passengers row: 3 avatar circles (for pooled)
    
    Fare reminder: "Earning ₹148 this trip"
    
    Large red button: "End Ride" (only shown when 
    driver is within 500m of final drop point — 
    prevent premature ending)
    
    If driver tries End Ride too far: 
    "You're 2.1 km from the destination. 
     Are you sure?" confirmation dialog

STATE: RIDE_ENDING
  Cash collection (if payment method = CASH):
    Full screen:
    "Collect payment from rider"
    Large amount: "₹148"
    If pooled: show per-rider amounts:
      Rider A: ₹74 · Rider B: ₹74
    "Confirm Cash Received" button
    Submits: POST /payments/:rideId/cash-confirm

### RideCompleteScreen.js
- Green success animation
- "Trip Complete! 🎉" heading
- Earnings card:
  "You earned ₹133" (after 10% commission)
  Breakdown: Fare ₹148 − Commission ₹15 = ₹133
  If shared bonus: "+ ₹12 pool bonus = ₹145 total"
- Trip stats: distance, duration, passengers (for pool)
- Today's running total: "₹473 today · 6 trips"
- Rating received (once rider submits, show it here 
  via socket or on next app open)
- "Back to Home" button (auto-redirects after 8s)

### EarningsScreen.js
- Today / This Week / This Month tab toggle
- Big earnings number at top (animated count-up 
  on screen enter)
- Bar chart (react-native-svg or Victory Native) 
  showing daily earnings for the week
- Trip list below: each trip shows time, 
  route summary, earnings, Solo/Shared badge
- Stats row: 
  Total trips | Avg fare | Pool trips | Rating

---

## LOCATION TRACKING (locationTracker.js)

When driver is ONLINE:
- expo-location: startLocationUpdatesAsync (background task)
- Emit driver:location_update every 4 seconds via socket:
  { lat, lng, heading, speed, timestamp }
- When driver goes OFFLINE: stop background task
- On app kill: background task continues 
  (configured via expo-task-manager)
- Battery optimization: if speed < 2 km/h for 60s, 
  reduce to 15s interval; speed resumes → back to 4s

---

## MOCK DATA

Same mock flag as rider app. Mock:
- Incoming ride requests (auto-trigger after 5s on 
  HomeScreen ONLINE for demo mode)
- Pooled ride with 2 passengers
- Earnings data for the week

---

## EDGE CASES IN DRIVER UI

- Phone call interrupts ride: 
  App resumes correctly, active ride state intact
- App killed during ride: 
  On relaunch, detect active ride from store/API, 
  restore RideActiveScreen
- OTP entered wrong 3 times: 
  Show "Contact support" option
- Driver tries to end ride far from destination: 
  Warn + confirm dialog
- Pool passenger cancels mid-ride: 
  Show notification "Rider B cancelled. 
  Fare adjusted to ₹X." Update bottom panel
- No internet during ride: 
  Queue location updates, flush when reconnected
- Low battery (<15%): 
  Show "Low battery" warning, suggest plugging in
- Driver declines too many rides (5 in a row): 
  Show "Accepting rides keeps you discoverable" nudge

---

## DELIVERABLES

Generate all files completely. No placeholders.
Start with:
1. package.json + app.json
2. src/theme/ (import from rider or duplicate)
3. src/store/ (all 3 stores)
4. src/services/ (api.js, socket.js, locationTracker.js)
5. src/components/
6. src/navigation/
7. src/screens/ in order:
   auth → kyc → main/HomeScreen → ride → earnings