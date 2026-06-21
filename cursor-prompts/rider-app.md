You are a senior React Native engineer and UI/UX designer. 
Build a PRODUCTION-READY, PREMIUM React Native (Expo SDK 51) 
Rider app for "Rido" — a smart ride-sharing platform in Tamil 
Nadu, India. Every screen must look and feel like a ₹10Cr-funded 
startup app. No placeholder UI. No lorem ipsum. Full working 
logic everywhere.

---

## TECH STACK

- Framework: React Native with Expo SDK 51
- Navigation: React Navigation v6 (Stack + Bottom Tab + 
  Modal stacks)
- State Management: Zustand (with persist middleware 
  for auth + preferences)
- API: Axios with interceptors (auto-attach JWT, 
  auto-refresh on 401)
- Real-time: Socket.io-client
- Maps: react-native-maps (Google Maps provider)
- Location: expo-location (foreground only for rider)
- Payments: react-native-razorpay
- Notifications: expo-notifications + 
  @react-native-firebase/messaging
- Forms: react-hook-form + zod
- Animations: react-native-reanimated v3 + 
  react-native-gesture-handler
- Icons: react-native-vector-icons (MaterialIcons + 
  Ionicons)
- i18n: i18next + react-i18next (Tamil + English)
- Storage: expo-secure-store (tokens), 
  @react-native-async-storage/async-storage (preferences)
- Dates: dayjs
- HTTP: axios

---

## DESIGN SYSTEM

Create src/theme/index.js with:

Colors:
  primary: '#6C63FF'        // Deep violet - brand color
  primaryDark: '#4B44CC'
  primaryLight: '#EEF0FF'
  secondary: '#FF6B6B'      // Coral - CTAs
  success: '#22C55E'
  warning: '#F59E0B'
  danger: '#EF4444'
  pink: '#EC4899'           // Women's ride accent
  pinkLight: '#FDF2F8'
  
  // Neutrals
  background: '#F8F9FE'
  surface: '#FFFFFF'
  surfaceSecondary: '#F1F3FA'
  border: '#E8EAF2'
  
  // Text
  textPrimary: '#1A1A2E'
  textSecondary: '#6B7280'
  textMuted: '#9CA3AF'
  textWhite: '#FFFFFF'
  
  // Map overlay
  mapOverlay: 'rgba(26,26,46,0.6)'

Typography:
  Use 'Poppins' (expo-font) as primary font
  Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 
           700 (Bold)
  Scale: xs(10), sm(12), base(14), md(16), lg(18), 
         xl(20), 2xl(24), 3xl(30), 4xl(36)

Spacing: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48)

Border Radius: sm(8), md(12), lg(16), xl(24), full(999)

Shadows:
  card: { shadowColor:'#6C63FF', shadowOffset:{0,4}, 
          shadowOpacity:0.08, shadowRadius:12, elevation:4 }
  modal: { shadowColor:'#000', shadowOffset:{0,-4}, 
           shadowOpacity:0.15, shadowRadius:20, elevation:20 }

---

## PROJECT STRUCTURE

rido-rider/
├── app.json
├── App.js
├── src/
│   ├── theme/
│   │   └── index.js
│   ├── constants/
│   │   ├── api.js          # Base URL, endpoints
│   │   └── ride.js         # Statuses, vehicle types, modes
│   ├── store/
│   │   ├── authStore.js    # Zustand: user, tokens, isLoggedIn
│   │   ├── rideStore.js    # Zustand: active ride state
│   │   └── appStore.js     # Zustand: language, theme prefs
│   ├── services/
│   │   ├── api.js          # Axios instance + interceptors
│   │   ├── socket.js       # Socket.io singleton
│   │   └── location.js     # expo-location helpers
│   ├── hooks/
│   │   ├── useSocket.js
│   │   ├── useLocation.js
│   │   ├── useRide.js
│   │   └── useAuth.js
│   ├── navigation/
│   │   ├── index.js        # Root navigator
│   │   ├── AuthNavigator.js
│   │   ├── MainNavigator.js
│   │   └── RideNavigator.js
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SplashScreen.js
│   │   │   ├── OnboardingScreen.js
│   │   │   └── OTPScreen.js
│   │   ├── home/
│   │   │   └── HomeScreen.js
│   │   ├── ride/
│   │   │   ├── DestinationSearchScreen.js
│   │   │   ├── RideOptionsScreen.js
│   │   │   ├── BookingConfirmScreen.js
│   │   │   ├── SearchingScreen.js
│   │   │   ├── PoolMatchScreen.js
│   │   │   ├── RideActiveScreen.js
│   │   │   └── RideSummaryScreen.js
│   │   ├── safety/
│   │   │   └── SOSScreen.js
│   │   └── profile/
│   │       ├── ProfileScreen.js
│   │       ├── RideHistoryScreen.js
│   │       ├── WalletScreen.js
│   │       └── EmergencyContactsScreen.js
│   └── components/
│       ├── ui/
│       │   ├── Button.js
│       │   ├── Input.js
│       │   ├── Card.js
│       │   ├── Badge.js
│       │   ├── Avatar.js
│       │   ├── Divider.js
│       │   ├── Loader.js
│       │   └── BottomSheet.js
│       ├── map/
│       │   ├── RidoMap.js
│       │   ├── DriverMarker.js
│       │   ├── PickupMarker.js
│       │   └── RoutePolyline.js
│       └── ride/
│           ├── VehicleCard.js
│           ├── FareBreakdown.js
│           ├── DriverCard.js
│           └── PoolInfoCard.js

---

## SCREENS — IMPLEMENT ALL COMPLETELY

### SplashScreen.js
- Rido logo centered with a smooth scale + fade-in animation
  (react-native-reanimated)
- Brand violet gradient background (#6C63FF → #4B44CC)
- "Smart rides. Split fares." tagline fades in 500ms after logo
- After 2s: check authStore.isLoggedIn
  → if true: navigate to Main
  → if false: navigate to Onboarding

### OnboardingScreen.js
- 3-slide horizontal flatlist swiper (no library needed, 
  use FlatList + Animated)
- Slide 1: Illustration area (use geometric SVG shapes as 
  placeholder), "Book in seconds", "Solo or shared — 
  you choose every time."
- Slide 2: "Split the fare, not the fun", "Matched with 
  riders on your route. Everyone saves."
- Slide 3: "Safe rides for women", "Female drivers. 
  Women-only pools. SOS in one tap."
- Dot indicators at bottom
- "Get Started" button on last slide → OTPScreen
- Skip button top right on slides 1-2
- Store hasSeenOnboarding in AsyncStorage

### OTPScreen.js
Two sub-states: PHONE_ENTRY and OTP_VERIFY

PHONE_ENTRY:
- "Enter your mobile number" heading (Poppins Bold 28)
- +91 country code prefix (non-editable) + 10-digit number input
- Number pad styled keyboard
- "Send OTP" primary button (full width, violet, rounded-full)
- "By continuing you agree to our Terms & Privacy Policy" 
  footer with tappable links
- On submit: call POST /api/v1/auth/send-otp
  Show loading state on button

OTP_VERIFY:
- "Verify your number" heading
- Show last 4 digits of phone: "OTP sent to +91 XXXXX X1234"
- 6-box OTP input (each box is a separate TextInput, 
  auto-focus next on entry, auto-submit on last digit)
- 60-second resend countdown with circular progress
- "Resend OTP" activates after 60s
- On verify: call POST /api/v1/auth/verify-otp
- If is_new_user: show "Welcome to Rido!" toast, go to 
  ProfileSetupScreen (collect name, gender — needed for 
  Women's ride logic)
- If existing user: go to HomeScreen
- Error states: wrong OTP (shake animation on boxes), 
  too many attempts (show lockout timer)

### HomeScreen.js
This is the most important screen. Must feel premium.

Layout:
- Full screen Google Map (react-native-maps) as background
- Top overlay (semi-transparent card):
  - "Good morning, [name] 👋" greeting (time-aware)
  - Saved addresses: Home / Work quick-tap chips
- Bottom sheet (always visible, 280px height, 
  can expand to full):
  - "Where to?" search bar (tappable, opens 
    DestinationSearchScreen as modal)
  - Recent destinations (last 3, stored in AsyncStorage)
  - Below recent: two promo chips 
    "🚗 Shared rides save up to 50%" and 
    "👩 Women's ride available"

Map features:
- Show user's current location blue dot
- On location permission denied: show permission request 
  card in bottom sheet
- Map style: use a clean light custom JSON style 
  (remove POI clutter, muted roads)

Real-time: if there's an active ride in rideStore, 
redirect to RideActiveScreen immediately on mount.

### DestinationSearchScreen.js
- Full screen modal with white background
- Back button top left
- Two input rows: 
  - Pickup (pre-filled with current address, editable)
  - Drop (focused immediately on open)
- Violet left border accent on focused input
- As user types drop location: call Google Places 
  Autocomplete API (debounced 300ms)
- Results list below: each item shows place name, 
  secondary address, distance if available
- Recent searches section (from AsyncStorage) shown 
  when input is empty
- Saved places at top: Home / Work with edit option
- On result select: navigate to RideOptionsScreen 
  with { pickup, drop } params

### RideOptionsScreen.js
Critical screen — the ride mode selector.

Top half: Map showing pickup → drop route polyline 
(call Directions API, draw polyline on map)

Bottom sheet (scrollable):
  
  Ride Mode Toggle (full-width segmented control):
  [ 🚗 Solo ]  [ 👥 Shared ]
  Shared is highlighted violet when selected. 
  Show "Save up to 50%" badge when Shared selected.

  Women's Ride toggle (only visible if rider.gender = FEMALE):
  Row with 👩 icon, "Women's Ride" label, 
  subtitle "Female drivers & riders only", 
  and a pink toggle switch on right.
  Background turns pinkLight when enabled.

  Vehicle Type Cards (horizontal scroll):
  For each vehicle type (AUTO, MINI_CAR, SEDAN, SUV):
    Card (160x120px):
    - Vehicle icon (use emoji: 🛺 auto, 🚗 mini, 🚙 sedan, 
      🚘 suv)
    - Vehicle name
    - Capacity: "Up to 3" with person icon
    - Solo fare: "₹120"
    - If Shared selected: show "₹60–80/person" 
      with green "save ₹40–60" below
    - ETA: "3 min"
    - Selected state: violet border, light violet background
  
  Selected vehicle fare breakdown card:
    If Solo: Base ₹30 + 8.2km × ₹12 + surge 1.0x = ₹128
    If Shared: estimated ₹64–80/person depending on matches
    Collapsible with chevron

  Surge warning banner (if surge > 1.0x):
    ⚡ "High demand — 1.5x surge active in your area"
    Orange background, dismissible

  "Book [Solo/Shared] Ride" CTA button at bottom
  Shows selected mode and fare in button: 
  "Book Shared · ₹64–80"

### BookingConfirmScreen.js
- Map with route (same as options screen, smaller)
- Pickup and drop address rows with violet/red dot icons
- Selected vehicle row with icon and capacity
- Fare summary card:
  - If Solo: final fare clearly
  - If Shared: "You'll pay ₹64–80" with note 
    "Final fare depends on passengers matched"
- Payment method row (tappable): 
  shows selected method (UPI/Cash/Wallet) with icon
  → tapping opens a bottom sheet with payment options
  Wallet shows balance. 
  UPI shows "Pay via any UPI app".
  Cash shows "Pay driver directly".
- Emergency contact row: "Trip shared with [contact name]" 
  with toggle to auto-share live location
- "Confirm Booking" button → calls POST /api/v1/rides
- Terms line: "Cancellation free within 2 min of driver 
  assignment"

### SearchingScreen.js
Two phases handled in same screen:

Phase 1 — SOLO or SHARED waiting for driver:
- Animated pulsing radar circle on map 
  (react-native-reanimated, violet rings expanding outward)
- "Finding your driver..." heading
- Estimated wait: "Usually under 3 minutes"
- Ride summary (pickup → drop, fare) in bottom card
- "Cancel" text button (free cancel at this stage)
- Socket listener: ride:driver_assigned → transition to 
  Phase 3

Phase 2 — SHARED waiting for pool match (first 5 min):
- Show "Looking for co-riders on your route..." 
- Animated route line on map with moving dots 
  representing potential matches
- Counter: "Pool closes in 4:32" (countdown)
- "Why share?" info card: 
  "You could save ₹60–100 if matched"
- Below the timer: "Skip sharing, go solo" text link
  → calls cancel on pool, resubmits as solo
- Socket listener: ride:pool_matched → 
  navigate to PoolMatchScreen

Phase 3 — DRIVER ASSIGNED (both modes):
- Map zooms to show driver's location with animated 
  car marker moving toward pickup
- Driver card (bottom sheet, 280px):
  - Driver avatar (circle, 56px)
  - Name, rating (⭐ 4.8), total trips
  - Vehicle: "White Maruti Alto · TN59 AB 1234"
  - ETA: "Arriving in 4 min" (live from socket)
  - Action row: [📞 Call] [💬 Message] [✕ Cancel]
    Call: uses masked number proxy
- Your OTP section: "Share this with driver at pickup"
  Large 4-digit OTP displayed prominently
- Socket listener: ride:driver_arrived → 
  show "Driver has arrived!" banner with haptic feedback

### PoolMatchScreen.js (shown when pool match found)
- Celebration micro-animation: 
  confetti burst (simple, custom, no library needed — 
  use Animated API with 20 colored dots)
- "You've been matched! 🎉" heading
- Route visualization: show combined route on map with 
  numbered pickup points (1 = you, 2 = co-rider pickup)
- Savings card (prominent, green background):
  "You save ₹85"
  Solo would've been ₹145 → You pay ₹60
- Co-rider info (ONLY show): 
  "1 co-rider · [First name only]"
  No photo, no phone, no last name
- If Women's ride: show "👩 Women-verified ride" badge
- "Looks good!" button → confirms pool, back to 
  SearchingScreen Phase 3
- "Cancel and go solo" text link (fare reverts to solo)

### RideActiveScreen.js
Full-screen map with floating UI elements.

Map:
- Animated driver marker (car icon rotates to heading)
- Pickup marker (violet pin) until picked up, 
  then drops off
- Drop marker (red pin, always visible)
- Route polyline (violet, 4px width)
- If pooled: show next co-rider pickup pin in orange

Top floating bar (safe area aware):
- Back button (← goes to minimized view, not cancels)
- "Rido" wordmark centered

Right side floating buttons:
- 🔴 SOS button (large, red circle, always visible)
  → long press 2s to trigger (prevent accidental)
- 📍 Re-center map button

Bottom sheet (fixed, 220px, not draggable during ride):
  Status line: 
    "On the way to pickup" / "Heading to your destination"
  
  Route mini-display:
    [Pickup dot] → [Drop dot]
    "2.4 km away" / "ETA 8 min"
  
  Driver row: avatar, name, vehicle number
  
  Progress bar (linear, violet fill) showing route completion

  If pooled and additional pickup pending:
    Orange banner: "Picking up 1 more passenger"

SOS flow (on confirmed long-press):
- Full screen red overlay
- "SOS Activated" 
- "Sending your location to [contact name]"
- Show SMS sending confirmation
- "Cancel SOS" button if triggered accidentally
- Call 112 option

Socket listeners:
- ride:driver_location → update driver marker position 
  with smooth animation
- ride:route_deviation → show bottom banner 
  "⚠️ Driver deviated from route" with SOS prompt
- ride:completed → navigate to RideSummaryScreen

### RideSummaryScreen.js
- Success checkmark animation (lottie-style, 
  use Animated — green circle draws in, checkmark appears)
- "Ride Complete!" heading
- Map thumbnail showing the route taken (static map image 
  via Google Static Maps API)
- Fare card:
  If Solo: ₹148 (breakdown collapsible)
  If Shared: "You paid ₹72" with "You saved ₹76 by sharing 🎉"
- Payment status chip (Paid via UPI / Cash)
- Distance · Duration row: "8.2 km · 24 min"
- RATE YOUR RIDE section:
  Driver name + avatar
  5 star selector (tap to select, selected stars fill violet)
  Comment input (optional): "Add a note..."
  "Submit Rating" button
- "Book another ride" button at bottom
- Share receipt option (generates text summary)

### SOSScreen.js (accessible anytime via profile)
- Manage emergency contacts (add/edit/delete)
- Test SOS button with confirmation dialog
- Explain what happens when SOS triggers

### ProfileScreen.js
- Header: avatar (tappable to change), name, phone, 
  rating as rider
- Menu items with icons and right chevrons:
  - Ride History
  - Wallet & Payments
  - Emergency Contacts
  - Women's Ride Settings (if female)
  - Language (Tamil / English toggle)
  - Help & Support
  - Terms & Privacy
  - Logout (red, bottom)
- Language switch should work immediately (i18next 
  changeLanguage)

### RideHistoryScreen.js
- Paginated list (cursor-based, load more on scroll end)
- Each ride card:
  - Date and time (dayjs: "Today, 9:41 AM")
  - Pickup → Drop (truncate at 25 chars each)
  - Mode badge: "Solo" (gray) or "Shared" (violet)
  - Women's badge if applicable (pink)
  - Fare: "₹148" — if shared, show "₹72 (saved ₹76)"
  - Status: Completed (green) / Cancelled (red)
  - Tap → ride detail modal with full breakdown

### WalletScreen.js
- Balance card (gradient, violet): 
  "Rido Wallet  ₹240.00"
- Add Money button → Razorpay flow for ₹100/200/500/1000
  or custom amount
- Transaction history list (paginated):
  Each item: type icon, description, amount (+/-), date

---

## GLOBAL COMPONENTS

### Button.js
Props: variant (primary/secondary/outline/ghost/danger), 
size (sm/md/lg), loading, disabled, fullWidth, leftIcon, 
rightIcon
Primary: violet background, white text, 
  loading shows ActivityIndicator
All variants have press animation 
(scale 0.97 on press, react-native-reanimated)

### BottomSheet.js
Custom implementation (no library):
- Uses react-native-reanimated + gesture-handler
- Snap points: [280, '50%', '90%']
- Backdrop with opacity animation
- Drag handle at top
- Keyboard aware (shifts up when keyboard opens)

### RidoMap.js
- Wraps MapView (Google Maps provider)
- Applies custom map style JSON (clean, minimal)
- Exposes: showRoute(pickup, drop, waypoints), 
  animateToRegion, addMarker

### DriverMarker.js
- Custom animated marker for driver
- Car emoji or SVG icon
- Rotates smoothly to match driver heading 
  (use Animated.timing on transform rotate)
- Small shadow beneath

---

## STATE MANAGEMENT (Zustand)

### authStore.js
{
  user: null,           // { id, name, phone, gender, 
                        //   profile_photo_url, wallet_balance }
  accessToken: null,
  refreshToken: null,
  isLoggedIn: false,
  setUser, setTokens, logout, updateWalletBalance
}
Persist to expo-secure-store (custom storage adapter)

### rideStore.js
{
  activeRide: null,     // full ride object from API
  driverLocation: null, // { lat, lng, heading }
  rideStatus: null,     // mirrors backend RideStatus enum
  pool: null,           // pool info if shared ride
  setActiveRide, updateDriverLocation, 
  updateRideStatus, clearRide
}

### appStore.js
{
  language: 'en',       // 'en' | 'ta'
  hasSeenOnboarding: false,
  setLanguage, setOnboardingSeen
}
Persist to AsyncStorage

---

## API SERVICE (services/api.js)

- Axios instance with baseURL from constants/api.js
- Request interceptor: attach Authorization: Bearer {token}
- Response interceptor: 
  - On 401: call refresh token endpoint, 
    retry original request once
  - On refresh fail: logout user, navigate to OTPScreen
  - On network error: show "No internet connection" toast
- All API calls wrapped in try/catch returning 
  { data, error } (never throw to component)

---

## SOCKET SERVICE (services/socket.js)

- Singleton socket instance
- connect(token): io(BASE_URL, { auth: { token } })
- Auto-reconnect with exponential backoff
- joinRideRoom(rideId): socket.emit('join', rideId)
- Methods for each event listener:
  onDriverLocation(cb), onRideStatus(cb), 
  onPoolMatched(cb), onDriverAssigned(cb), 
  onRideComplete(cb), onRouteDeviation(cb)
- disconnect() cleans up all listeners

---

## i18n SETUP

Create src/i18n/en.json and src/i18n/ta.json with 
ALL UI strings translated. Key sections:
- auth: OTP screen strings
- home: Home screen strings  
- ride: All ride flow strings (including pool match, 
  fare breakdown)
- safety: SOS strings
- profile: Profile screen strings
- errors: All error messages

Tamil translations must be accurate — 
use proper Tamil script (unicode).

---

## NOTIFICATIONS

- On app launch: request push permission (Expo)
- Register FCM token → PATCH /api/v1/users/me 
  with fcm_token
- Handle foreground notifications with 
  expo-notifications: show in-app banner 
  (custom component, slides down from top, 
  auto-dismiss 4s)
- Handle background tap: deep-link to active ride 
  if notification type = 'ride_update'

---

## MOCK DATA LAYER

Create src/services/mockData.js with realistic mock 
responses for every API endpoint. Add an ENV flag: 
USE_MOCK_API=true in app.config.js. When true, 
all API calls return mock data with a 800ms delay 
to simulate network. This allows full UI development 
without a running backend.

---

## EDGE CASES IN UI

- No internet: show offline banner (red, top), 
  disable booking button
- Location permission denied: show permission card, 
  "Enable Location" button opens Settings
- Active ride detected on app launch: 
  skip home, go directly to RideActiveScreen
- App killed mid-ride, relaunched: 
  GET /rides/:id to restore state
- OTP boxes: handle paste (user copies OTP from SMS), 
  auto-fill all 6 boxes
- Fare changes after pool match: 
  show "Your fare updated" modal with old vs new fare
- Driver ETA "< 1 min": show "Driver is almost here!" 
  with haptic
- Pool fallback to solo: toast notification 
  "No co-riders found. Converted to solo ride. 
   Fare: ₹148"
- Payment fails: show retry sheet with options 
  (try UPI, switch to Cash, retry)
- Rating already submitted: show submitted state 
  (disabled stars with submitted values)

---

## DELIVERABLES

Generate ALL files completely. No placeholder comments. 
Every screen fully implemented with real logic, 
animations, and API integration. Start with:
1. package.json + app.json
2. src/theme/index.js
3. src/constants/
4. src/store/ (all 3 stores)
5. src/services/ (api.js, socket.js, mockData.js)
6. src/components/ui/ (all components)
7. src/components/map/ and src/components/ride/
8. src/navigation/
9. src/screens/ (in order: auth → home → ride → profile)
10. src/i18n/ (en.json + ta.json)