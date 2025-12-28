# Producer Tour - API Integration Guide

This is a great question! Based on your gamified corporate structure platform with the 3D experience, quest systems, and business tools, here are APIs organized by category that could significantly enhance the experience:

---

## Table of Contents

1. [Corporate Data & Intelligence](#-corporate-data--intelligence)
2. [Billing & Subscriptions](#-billing--subscriptions)
3. [Gamification & Engagement](#-gamification--engagement)
4. [3D Experience Enhancement](#-3d-experience-enhancement)
5. [Documents & Legal](#-documents--legal)
6. [AI Enhancement](#-ai-enhancement)
7. [Partner Research Links](#-partner-research-links)
8. [Free/Generous Tiers](#-freegenerious-tiers)
9. [Implementation Priority](#-recommended-integration-priority)

---

## 🏢 Corporate Data & Intelligence

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **OpenCorporates** | Real company registry data | Free tier, 100M+ companies globally - great for validating/populating your corporate structure | [Documentation](https://api.opencorporates.com/documentation/API-Reference) |
| **Crunchbase API** | Startup/investor data | Show funding rounds, investors, acquisitions in your 3D visualization | [Getting Started](https://data.crunchbase.com/docs/crunchbase-basic-getting-started) |
| **SEC EDGAR** | Public company filings | Free! Pull real 10-K, 10-Q filings for educational quests | [Developer Portal](https://www.sec.gov/developer) |
| **Clearbit** | Company enrichment | Auto-populate logos, employee counts, tech stacks | [Enrichment API](https://clearbit.com/platform/enrichment) |
| **Dun & Bradstreet** | Business credit/hierarchy | Corporate family trees, subsidiary relationships | [Developer Portal](https://developer.dnb.com/) |

### Dun & Bradstreet - Deep Dive

**Use Cases for Your 3D Corporate Structure:**

| Feature | Implementation |
|---------|----------------|
| **Auto-populate Holdings** | User enters a D-U-N-S number → API returns entire corporate family tree → Auto-generate 3D nodes for parent companies, subsidiaries, branches |
| **"Corporate DNA" Quest** | Quest where users explore a real company's hierarchy, learning about holding structures through your 3D interface |
| **Risk Assessment Orbiters** | Those compliance orbiters you built? Color-code them based on D&B credit scores and risk indicators |
| **Merger Simulations** | Pull two real company structures, let users simulate mergers in 3D and see combined hierarchies |

```typescript
// Example: Fetch corporate family tree
const corporateTree = await dnb.get(`/v1/match/cleanseMatch`, {
  name: "Apple Inc",
  countryISOAlpha2Code: "US"
});
// Returns: parent companies, subsidiaries, branch locations
// → Feed into your Holdings 3D visualization
```

---

## 💳 Billing & Subscriptions

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **Stripe** | Payments + Billing Portal | Subscription management, invoices, tax handling, embedded components | [API Docs](https://stripe.com/docs/api) |
| **Paddle** | MoR (Merchant of Record) | Handles global tax compliance - they're the seller | [Developer Docs](https://developer.paddle.com/) |
| **LemonSqueezy** | Digital products | Great for selling in-game items, upgrades, courses | [API Docs](https://docs.lemonsqueezy.com/api) |
| **Chargebee** | Enterprise billing | Usage-based billing, revenue recognition | [API Reference](https://www.chargebee.com/docs/2.0/api_v2.html) |

### Recommended Hybrid Approach

| Platform | Use For | Why |
|----------|---------|-----|
| **Paddle** | Core subscriptions (Producer Tour Pro, Enterprise) | They handle ALL tax globally - you never touch VAT/GST |
| **LemonSqueezy** | In-game purchases, one-time items | Perfect for cosmetics, avatar items, course unlocks |
| **Chargebee** | Enterprise/API usage billing | If you offer API access to your corporate structure tools |

### In-Game Store Ideas (LemonSqueezy)

| Item | Price | Description |
|------|-------|-------------|
| 🚀 Premium Spaceship Skins | $4.99 | Custom FBX models for the Holdings interior |
| 🏢 Corporate Template Packs | $9.99 | Pre-built structure templates (LLC, S-Corp, C-Corp) |
| 📚 Quest Expansion: "The IPO Journey" | $14.99 | New quest chain teaching public company structures |
| 👔 Executive Avatar Bundle | $2.99 | Suits, ties, briefcases for Ready Player Me avatars |
| ⚡ Quest Speed Boost | $0.99 | Complete compliance quests faster |

```typescript
// LemonSqueezy webhook for in-game purchase
app.post('/webhooks/lemonsqueezy', async (req, res) => {
  const { event_name, data } = req.body;

  if (event_name === 'order_created') {
    await unlockUserItem(data.attributes.user_email, data.attributes.product_id);
    await triggerAchievement(userId, 'FIRST_PURCHASE');
    // Stream activity: "User unlocked Premium Spaceship!"
  }
});
```

---

## 🎮 Gamification & Engagement

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **Stream** | Activity feeds, chat | Social features - "User completed Corporate Quest!" | [Activity Feeds](https://getstream.io/activity-feeds/) |
| **Liveblocks** | Real-time collaboration | Multi-user editing of corporate structures | [API Reference](https://liveblocks.io/docs/api-reference) |
| **OneSignal** | Push notifications | Quest reminders, achievement unlocks | [REST API](https://documentation.onesignal.com/reference) |
| **GameAnalytics** | Player analytics | Track quest completion rates, engagement | [REST API](https://docs.gameanalytics.com/integrations/rest-api) |

### Stream - Social Backbone

**Activity Feed Implementation:**

| Feed Type | Content |
|-----------|---------|
| **Global Feed** | "🏆 @jerome completed 'Corporate Compliance 101' quest!" |
| **Holdings Feed** | Activity within a specific corporate structure workspace |
| **Personal Feed** | Your achievements, followed users' activities |
| **Leaderboard Feed** | Weekly top quest completers |

```typescript
// Post achievement to Stream
import { StreamClient } from 'stream-feed';

const client = new StreamClient(API_KEY, API_SECRET);
const userFeed = client.feed('user', userId);

await userFeed.addActivity({
  actor: `user:${userId}`,
  verb: 'completed',
  object: 'quest:corporate-compliance-101',
  foreign_id: `quest:${questId}`,
  badge_earned: 'compliance_master',
  xp_gained: 500,
  // Custom fields for your 3D world
  location: 'holdings_interior',
  spaceship_used: 'unaf_cruiser'
});
```

**Chat Rooms:**
- Global lobby
- Per-Holdings workspace chat
- Quest party chat (collaborative quests)
- Direct messages

### Liveblocks - Real-Time Collaboration Magic

This is **HUGE** for your corporate structure editor:

| Feature | How It Works |
|---------|--------------|
| **Multiplayer Structure Editing** | Multiple users edit the same corporate structure in real-time, see each other's cursors |
| **Presence Indicators** | See who's viewing which entity in the 3D space |
| **Comments on Entities** | Click on a subsidiary → leave a comment → others see it live |
| **Conflict Resolution** | Built-in CRDT handling so edits don't conflict |

```typescript
// Liveblocks in your Holdings interior
import { useOthers, useMyPresence, useMutation } from "@liveblocks/react";

function HoldingsInterior() {
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();

  // Show other users' avatars in the 3D space
  return (
    <Canvas>
      {others.map(user => (
        <OtherPlayerAvatar
          key={user.connectionId}
          position={user.presence.position}
          avatar={user.presence.avatarUrl}
          selectedEntity={user.presence.focusedEntity}
        />
      ))}

      {/* Your corporate structure */}
      <CorporateStructure3D
        onEntitySelect={(entity) => {
          updateMyPresence({ focusedEntity: entity.id });
        }}
      />
    </Canvas>
  );
}
```

### OneSignal - Smart Notifications

| Trigger | Notification |
|---------|--------------|
| Quest available | "🎯 New Quest: 'Form Your First LLC' is now available!" |
| Deadline approaching | "⚠️ Your Annual Report for Delaware LLC is due in 7 days" |
| Social | "👋 @partner joined your Holdings workspace" |
| Achievement | "🏆 You earned 'Tax Master' badge!" |
| Re-engagement | "🚀 Your spaceship misses you! 3 new quests await" |

```typescript
// Trigger notification from backend
await oneSignal.createNotification({
  include_player_ids: [userOneSignalId],
  headings: { en: "Quest Complete! 🎉" },
  contents: { en: "You mastered Corporate Compliance. +500 XP" },
  data: {
    type: 'quest_complete',
    questId: 'corporate-compliance-101',
    xp: 500,
    deepLink: '/holdings/quests/rewards'
  },
  // Rich notification with image
  big_picture: "https://assets.producertour.com/quests/compliance-badge.png"
});
```

### GameAnalytics - Understand Your Players

| Metric | Insight |
|--------|---------|
| Quest funnel | Where do users drop off in "Form an LLC" quest? |
| Session length | How long do users spend in Holdings interior? |
| Feature usage | Do users prefer 2D structure view or 3D? |
| Monetization | Which in-game items sell best? |
| Cohort retention | Do users who complete onboarding quest return more? |

```typescript
// Track quest events
GameAnalytics.addProgressionEvent(
  EGAProgressionStatus.Complete,
  "CorporateQuests",      // Category
  "ComplianceTrack",      // Quest line
  "AnnualReport"          // Specific quest
);

// Track 3D interactions
GameAnalytics.addDesignEvent("Holdings:EntityClicked:Subsidiary", 1);
GameAnalytics.addDesignEvent("Holdings:SpaceshipChanged:UNAF", 1);
```

---

## 🌐 3D Experience Enhancement

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **Ready Player Me** | Custom avatars | Users create 3D avatars for your Holdings interior | [API Reference](https://docs.readyplayer.me/ready-player-me/api-reference) |
| **Spline** | Interactive 3D assets | Embed interactive 3D elements without coding | [Runtime Library](https://docs.spline.design/doc/spline-runtime-library-PJbxAnJr2G) |
| **Mapbox GL** | 3D globe/maps | Visualize global corporate presence | [API Docs](https://docs.mapbox.com/mapbox-gl-js/api/) |
| **Sketchfab** | 3D model library | Pull professional 3D assets for your environment | [Data API](https://sketchfab.com/developers/data-api) |

### Ready Player Me - Personalized Avatars

| Integration Point | Experience |
|-------------------|------------|
| **Onboarding** | "Create your Executive Avatar" as first quest |
| **Holdings Interior** | Your avatar walks/flies through the 3D corporate structure |
| **Multiplayer** | See other users' avatars in shared workspaces |
| **Achievements** | Unlock avatar items (suits, accessories) via quests |

```typescript
// Embed avatar creator
<iframe
  src="https://producer-tour.readyplayer.me/avatar?frameApi"
  allow="camera *; microphone *"
/>

// Receive created avatar
window.addEventListener('message', (event) => {
  if (event.data.type === 'v1.avatar.exported') {
    const avatarUrl = event.data.data.url;
    // Load into your Three.js scene
    loadAvatarIntoHoldings(avatarUrl);
  }
});
```

**Avatar Customization Store (via LemonSqueezy):**
- Business suits
- Industry-specific outfits (tech hoodie, finance suit)
- Accessories (briefcase, laptop, coffee)
- Special items (golden tie for completing all quests)

### Spline - 3D Administrative Interfaces

Perfect for making business tasks feel premium:

| Admin Task | Spline 3D Interface |
|------------|---------------------|
| **Dashboard** | 3D floating panels showing company metrics |
| **Document Signing** | Documents float in 3D space, tap to sign |
| **Entity Creation** | 3D form that builds a corporate structure node as you fill it |
| **Billing Overview** | 3D visualization of revenue flows between entities |
| **Team Management** | Org chart as interactive 3D constellation |

```typescript
// Embed Spline scene for document signing
import { Application } from '@splinetool/runtime';

const canvas = document.getElementById('admin-canvas');
const app = new Application(canvas);

await app.load('https://prod.spline.design/your-admin-scene/scene.splinecode');

// Trigger animations based on user actions
app.emitEvent('documentSign', 'mouseDown');
```

**Spline Scene Ideas:**
1. **Filing Cabinet Room** - Walk up to drawers, pull out documents
2. **Control Bridge** - Spaceship-style dashboard for company metrics
3. **Holographic Boardroom** - Present quarterly reports in 3D
4. **Entity Factory** - Watch your LLC "get built" as an assembly line

### Mapbox GL - Global Corporate Presence

| Visualization | Use Case |
|---------------|----------|
| **3D Globe** | Show all your entity locations worldwide |
| **Jurisdiction Picker** | Interactive globe to select where to form entities |
| **Subsidiary Network** | Lines connecting parent/child companies globally |
| **Tax Optimization** | Visualize tax implications of different jurisdictions |

```typescript
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: 'globe-container',
  style: 'mapbox://styles/mapbox/dark-v11',
  projection: 'globe',
  zoom: 1.5
});

// Add corporate entities as 3D markers
corporateEntities.forEach(entity => {
  new mapboxgl.Marker({
    element: create3DEntityMarker(entity.type)
  })
  .setLngLat([entity.longitude, entity.latitude])
  .setPopup(new mapboxgl.Popup().setHTML(`
    <h3>${entity.name}</h3>
    <p>Type: ${entity.type}</p>
    <p>Jurisdiction: ${entity.state}</p>
  `))
  .addTo(map);
});
```

### Sketchfab - Premium 3D Assets

| Asset Type | Use In |
|------------|--------|
| **Office buildings** | Represent different entity types |
| **Spaceships** | User vehicles in Holdings interior |
| **Furniture** | Populate 3D boardrooms |
| **Characters** | NPCs for quest guidance |

```typescript
// Fetch and load Sketchfab model
const response = await fetch(
  `https://api.sketchfab.com/v3/models/${modelId}/download`,
  { headers: { Authorization: `Token ${SKETCHFAB_TOKEN}` }}
);

const { glb } = await response.json();
// Load into Three.js
const gltf = await loader.loadAsync(glb.url);
scene.add(gltf.scene);
```

---

## 📄 Documents & Legal

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **DocuSign** | E-signatures | Sign formation docs directly in your app | [Developer Center](https://developers.docusign.com/) |
| **HelloSign (Dropbox Sign)** | E-signatures | Alternative to DocuSign, simpler API | [Developer Docs](https://developers.hellosign.com/) |
| **PandaDoc** | Document automation | Generate operating agreements, bylaws | [API Docs](https://developers.pandadoc.com/) |
| **Anvil** | PDF filling | Auto-fill government forms | [API Docs](https://www.useanvil.com/docs/api/) |

---

## 🤖 AI Enhancement

| API | Use Case | Why It's Valuable | Link |
|-----|----------|-------------------|------|
| **Anthropic (Claude)** | Business analysis | "Explain this corporate structure" in-game advisor | [API Docs](https://docs.anthropic.com/en/api) |
| **OpenAI** | Content generation | Generate quest narratives, educational content | [API Reference](https://platform.openai.com/docs/api-reference) |
| **Replicate** | Custom AI models | Run specialized business models | [HTTP API](https://replicate.com/docs/reference/http) |

### Claude (Anthropic) - Business Intelligence Advisor

| Feature | Implementation |
|---------|----------------|
| **Structure Advisor** | "Should I form an LLC or S-Corp for my situation?" |
| **Compliance Guide** | "What filings are due for my Delaware LLC this quarter?" |
| **Quest Helper** | In-game AI that explains concepts during quests |
| **Document Explainer** | Upload Operating Agreement → Get plain English summary |

```typescript
// In-game AI advisor
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: `You are the Corporate Advisor AI inside Producer Tour's Holdings experience.
    The user is viewing their corporate structure with entities: ${JSON.stringify(userEntities)}.
    Respond concisely and gamify when appropriate. Award XP for good questions.`,
  messages: [{
    role: "user",
    content: userQuestion
  }]
});
```

### OpenAI - Content & Creative

| Feature | Implementation |
|---------|----------------|
| **Quest Narrative** | Generate engaging storylines for educational quests |
| **Document Drafting** | First drafts of bylaws, operating agreements |
| **Image Generation** | Custom achievement badges, entity icons |

### Replicate - Specialized Models

| Model | Use Case |
|-------|----------|
| **Stable Diffusion** | Generate custom corporate logos based on company name |
| **Whisper** | Voice commands in 3D space ("Navigate to subsidiary") |
| **Custom Fine-tuned** | Train on corporate law documents for specialized advice |

---

## 📌 Partner Research Links

These are the APIs you and your partner have already researched:

| API | Link |
|-----|------|
| WhatsApp Business | https://developers.facebook.com/docs/whatsapp |
| CorpNet Business Formation | https://www.corpnet.com/corpnet-api/ |
| USPTO | https://developer.uspto.gov/api-catalog |
| MyCompanyWorks Entity Formation | https://www.mycompanyworks.com/entitymachine/entity-formation-api |
| OpenCorporates | https://api.opencorporates.com/ |
| Merge Unified API | https://merge.dev/docs |
| Cognism Company Data | https://www.cognism.com/product/integrations |

---

## 💸 Free/Generous Tiers

These APIs have free tiers to get started:

| API | Free Tier Details |
|-----|-------------------|
| **SEC EDGAR** | Completely free, no limits |
| **OpenCorporates** | Free tier available |
| **Stripe** | Pay-as-you-go, no monthly fee |
| **OneSignal** | Free up to 10k subscribers |
| **GameAnalytics** | Free tier available |
| **Ready Player Me** | Free for indie/small projects |
| **Liveblocks** | Free for up to 10 MAU |
| **Stream** | Free tier with limits |

---

## 🎯 Recommended Integration Priority

| Phase | APIs | Why First |
|-------|------|-----------|
| **Phase 1** | Liveblocks + Stream | Makes Holdings feel alive & multiplayer |
| **Phase 2** | Ready Player Me + LemonSqueezy | Monetization + personalization |
| **Phase 3** | Spline + Claude | Premium admin experience + smart assistance |
| **Phase 4** | D&B + Mapbox | Real corporate data visualization |
| **Phase 5** | GameAnalytics + OneSignal | Optimize & retain users |

---

## Quick Reference - All API Links

### Corporate Data & Intelligence
- OpenCorporates: https://api.opencorporates.com/documentation/API-Reference
- Crunchbase: https://data.crunchbase.com/docs/crunchbase-basic-getting-started
- SEC EDGAR: https://www.sec.gov/developer
- Clearbit: https://clearbit.com/platform/enrichment
- Dun & Bradstreet: https://developer.dnb.com/

### Billing & Subscriptions
- Stripe: https://stripe.com/docs/api
- Paddle: https://developer.paddle.com/
- LemonSqueezy: https://docs.lemonsqueezy.com/api
- Chargebee: https://www.chargebee.com/docs/2.0/api_v2.html

### Gamification & Engagement
- Stream: https://getstream.io/activity-feeds/
- Liveblocks: https://liveblocks.io/docs/api-reference
- OneSignal: https://documentation.onesignal.com/reference
- GameAnalytics: https://docs.gameanalytics.com/integrations/rest-api

### 3D Experience Enhancement
- Ready Player Me: https://docs.readyplayer.me/ready-player-me/api-reference
- Spline: https://docs.spline.design/doc/spline-runtime-library-PJbxAnJr2G
- Mapbox GL: https://docs.mapbox.com/mapbox-gl-js/api/
- Sketchfab: https://sketchfab.com/developers/data-api

### Documents & Legal
- DocuSign: https://developers.docusign.com/
- HelloSign: https://developers.hellosign.com/
- PandaDoc: https://developers.pandadoc.com/
- Anvil: https://www.useanvil.com/docs/api/

### AI Enhancement
- Anthropic (Claude): https://docs.anthropic.com/en/api
- OpenAI: https://platform.openai.com/docs/api-reference
- Replicate: https://replicate.com/docs/reference/http
