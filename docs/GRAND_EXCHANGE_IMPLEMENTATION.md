# Grand Exchange Marketplace Implementation Plan

A RuneScape-style blind order book marketplace for trading in-game items.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data Storage | PostgreSQL (Prisma) | Existing infrastructure, transactions support |
| Inventory Model | Server-authoritative | Required for real trading - items tracked in DB |
| Currency | Gold only | Uses existing `currencies.gold` from inventoryStore |
| Item Registry | Hybrid (DB + cache) | GEItem in Prisma, cached on frontend for performance |
| Order Book | Blind | Players see guide price + trend, not order depth |
| Order Slots | 6 per player | RuneScape-style limit |
| Trade Limits | 4-hour rolling | Per-item-per-user to prevent manipulation |
| Pricing | VWAP with decay | Volume-weighted average, 24h half-life |

---

## Phase 0: Server-Side Player Inventory (Prerequisite)

**Why**: Currently `inventoryStore.ts` is localStorage-only. For real trading, the server must track player items.

### 0.1 Database Schema Additions

**File**: `apps/backend/prisma/schema.prisma`

```prisma
// Player's in-game inventory (server-authoritative)
model PlayerInventory {
  id        String   @id @default(cuid())
  userId    String
  itemId    String   // References GEItem.id
  quantity  Int      @default(1)
  slot      Int?     // Inventory slot position (0-29)
  equipped  Boolean  @default(false)
  hotbarSlot Int?    // If assigned to hotbar (0-11)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  item      GEItem   @relation(fields: [itemId], references: [id])

  @@unique([userId, slot])
  @@unique([userId, itemId, equipped]) // Prevent duplicate equipped items
  @@index([userId])
}
```

### 0.2 Inventory API Routes

**New File**: `apps/backend/src/routes/inventory.routes.ts`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/inventory` | Get player's full inventory |
| POST | `/api/inventory/add` | Add item (admin/drops) |
| DELETE | `/api/inventory/:id` | Remove item |
| PATCH | `/api/inventory/:id/move` | Move to slot |
| PATCH | `/api/inventory/:id/equip` | Equip/unequip |
| PATCH | `/api/inventory/:id/hotbar` | Assign to hotbar |

### 0.3 Frontend Sync

**Modify**: `apps/frontend/src/lib/economy/inventoryStore.ts`

- Remove localStorage persistence
- Add `fetchInventory()` action that calls API on game load
- All mutations (`addItem`, `removeItem`, `moveItem`) call API first, then update local state
- Optimistic updates with rollback on error

---

## Phase 1: Grand Exchange Database Schema

**File**: `apps/backend/prisma/schema.prisma`

### 1.1 Enums

```prisma
enum GEOrderType {
  BUY
  SELL
}

enum GEOrderStatus {
  ACTIVE
  PARTIAL
  COMPLETED
  CANCELLED
  EXPIRED
}

enum GEPriceTrend {
  STABLE
  RISING
  FALLING
}
```

### 1.2 GEItem Model (Canonical Item Registry)

```prisma
model GEItem {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  type        String   // weapon, armor, consumable, material, currency, collectible, nft
  rarity      String   // common, uncommon, rare, epic, legendary
  icon        String?  // Icon URL or emoji
  modelPath   String?  // 3D model path for preview
  stackable   Boolean  @default(true)
  maxStack    Int      @default(999)
  tradeable   Boolean  @default(true)

  // Market configuration
  basePrice   Int      @default(1)     // Starting guide price
  minPrice    Int?                      // Price floor (optional)
  maxPrice    Int?                      // Price ceiling (optional)
  tradeLimit  Int      @default(10000) // Max per 4-hour window

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  market      GEMarket?
  orders      GEOrder[]
  transactions GETransaction[]
  priceHistory GEPriceHistory[]
  inventorySlots PlayerInventory[]
  tradeLimits GETradeLimit[]
}
```

### 1.3 GEMarket Model (Live Price Layer)

```prisma
model GEMarket {
  id          String       @id @default(cuid())
  itemId      String       @unique
  guidePrice  Int          // Current VWAP
  trend       GEPriceTrend @default(STABLE)
  volume24h   Int          @default(0)
  high24h     Int?
  low24h      Int?
  lastTradeAt DateTime?

  updatedAt   DateTime     @updatedAt

  item        GEItem       @relation(fields: [itemId], references: [id])
}
```

### 1.4 GEOrder Model (Order Book)

```prisma
model GEOrder {
  id              String        @id @default(cuid())
  userId          String
  itemId          String
  type            GEOrderType
  status          GEOrderStatus @default(ACTIVE)

  quantity        Int           // Total requested
  quantityFilled  Int           @default(0)
  price           Int           // Limit price

  slot            Int           // Order slot (0-5)
  expiresAt       DateTime      // 7-day expiry

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  user            User          @relation(fields: [userId], references: [id])
  item            GEItem        @relation(fields: [itemId], references: [id])

  transactionsAsBuy  GETransaction[] @relation("GEBuyer")
  transactionsAsSell GETransaction[] @relation("GESeller")

  @@unique([userId, slot])
  @@index([itemId, type, status])
  @@index([userId])
}
```

### 1.5 GETransaction Model (Trade History)

```prisma
model GETransaction {
  id           String   @id @default(cuid())
  itemId       String
  buyOrderId   String
  sellOrderId  String
  buyerId      String
  sellerId     String

  quantity     Int
  pricePerUnit Int      // Execution price (maker's price)
  totalPrice   Int      // quantity * pricePerUnit

  executedAt   DateTime @default(now())

  item         GEItem   @relation(fields: [itemId], references: [id])
  buyOrder     GEOrder  @relation("GEBuyer", fields: [buyOrderId], references: [id])
  sellOrder    GEOrder  @relation("GESeller", fields: [sellOrderId], references: [id])
  buyer        User     @relation("GEBuyer", fields: [buyerId], references: [id])
  seller       User     @relation("GESeller", fields: [sellerId], references: [id])

  @@index([itemId])
  @@index([buyerId])
  @@index([sellerId])
}
```

### 1.6 GEPriceHistory Model (Charts)

```prisma
model GEPriceHistory {
  id        String   @id @default(cuid())
  itemId    String
  price     Int      // Closing price for period
  volume    Int      // Trade volume in period
  high      Int
  low       Int
  period    DateTime // Start of 1-hour bucket

  item      GEItem   @relation(fields: [itemId], references: [id])

  @@unique([itemId, period])
  @@index([itemId, period])
}
```

### 1.7 GETradeLimit Model (Anti-Manipulation)

```prisma
model GETradeLimit {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  quantity  Int      // Amount traded in window
  windowEnd DateTime // When limit resets

  user      User     @relation(fields: [userId], references: [id])
  item      GEItem   @relation(fields: [itemId], references: [id])

  @@unique([userId, itemId])
}
```

### 1.8 User Model Additions

```prisma
// Add to existing User model:
playerInventory  PlayerInventory[]
geOrders         GEOrder[]
gePurchases      GETransaction[] @relation("GEBuyer")
geSales          GETransaction[] @relation("GESeller")
geTradeLimits    GETradeLimit[]
```

---

## Phase 2: Backend Services

### 2.1 Grand Exchange Service

**New File**: `apps/backend/src/services/ge.service.ts`

#### Core Functions

| Function | Description |
|----------|-------------|
| `placeOrder(userId, itemId, type, price, quantity, slot)` | Validate limits, lock items/gold, create order, attempt match |
| `matchOrders(itemId)` | Price-time priority matching algorithm |
| `cancelOrder(userId, orderId)` | Cancel and refund locked items/gold |
| `collectOrder(userId, orderId)` | Claim completed items/gold to inventory |
| `calculateGuidePrice(itemId)` | VWAP with exponential time decay |
| `getUserOrders(userId)` | Get 6 order slots |
| `getMarketData(itemId)` | Guide price, trend, 24h volume |
| `getPriceHistory(itemId, period)` | For charts |
| `checkTradeLimit(userId, itemId)` | Validate 4-hour rolling limit |

#### Matching Algorithm

```typescript
async function matchOrders(itemId: string) {
  // 1. Get active buy orders (highest price first, oldest first within price)
  // 2. Get active sell orders (lowest price first, oldest first within price)
  // 3. While bestBuy.price >= bestSell.price:
  //    - Execute at maker's (existing order's) price
  //    - Create GETransaction
  //    - Update both orders (quantityFilled, status)
  //    - Transfer items/gold (or mark as collectable)
  // 4. Recalculate guide price
  // 5. Emit socket events
}
```

#### Guide Price Calculation

```typescript
async function calculateGuidePrice(itemId: string) {
  // Get trades from last 24 hours
  // Apply exponential time decay (half-life = 24h)
  // Calculate volume-weighted average
  // Smooth: newGuide = 0.8 * oldGuide + 0.2 * vwap
  // Update GEMarket.guidePrice and trend
}
```

### 2.2 Inventory Service

**New File**: `apps/backend/src/services/inventory.service.ts`

| Function | Description |
|----------|-------------|
| `getInventory(userId)` | Full inventory with items joined |
| `addItem(userId, itemId, quantity)` | Add to first available slot (stack if possible) |
| `removeItem(userId, inventoryId, quantity)` | Remove items (for selling/dropping) |
| `moveItem(userId, fromSlot, toSlot)` | Reorder inventory |
| `equipItem(userId, inventoryId)` | Toggle equipped |
| `setHotbar(userId, inventoryId, hotbarSlot)` | Assign to hotbar |
| `lockForGE(userId, inventoryId, quantity)` | Reserve for sell order |
| `unlockFromGE(userId, inventoryId, quantity)` | Return if cancelled |

---

## Phase 3: API Routes

### 3.1 Grand Exchange Routes

**New File**: `apps/backend/src/routes/ge.routes.ts`

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/ge/orders` | Place buy/sell order | Required |
| GET | `/api/ge/orders` | Get user's 6 order slots | Required |
| DELETE | `/api/ge/orders/:id` | Cancel order | Required |
| POST | `/api/ge/orders/:id/collect` | Claim completed items/gold | Required |
| GET | `/api/ge/collectables` | Items ready to claim | Required |
| GET | `/api/ge/history` | User's completed trades | Required |
| GET | `/api/ge/market/:itemId` | Guide price, trend, volume | Public |
| GET | `/api/ge/market/:itemId/history` | Price chart data | Public |
| GET | `/api/ge/items` | All tradeable items (cached) | Public |
| GET | `/api/ge/items/search` | Search items by name | Public |

### 3.2 Register Routes

**Modify**: `apps/backend/src/index.ts`

```typescript
import geRoutes from './routes/ge.routes';
import inventoryRoutes from './routes/inventory.routes';

app.use('/api/ge', geRoutes);
app.use('/api/inventory', inventoryRoutes);
```

---

## Phase 4: Real-Time Updates

**Modify**: `apps/backend/src/socket/index.ts`

### Socket Events

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `ge:order:partial` | Server→Client | `{ orderId, filled, remaining }` | Order partially filled |
| `ge:order:complete` | Server→Client | `{ orderId }` | Order fully filled |
| `ge:collectable` | Server→Client | `{ orderId, type, quantity, itemId }` | Items ready to claim |
| `ge:price:update` | Broadcast | `{ itemId, guidePrice, trend }` | Guide price changed |

### Implementation

```typescript
// In ge.service.ts after trade execution:
io.to(`user:${buyerId}`).emit('ge:order:partial', { orderId: buyOrder.id, filled, remaining });
io.emit('ge:price:update', { itemId, guidePrice: newPrice, trend });
```

---

## Phase 5: Frontend Store

**New File**: `apps/frontend/src/lib/economy/geStore.ts`

```typescript
interface GEState {
  // UI State
  isOpen: boolean;
  currentView: 'browse' | 'orders' | 'history';

  // Data
  items: Map<string, GEItem>;          // Cached item registry
  orderSlots: (GEOrder | null)[];      // 6 slots
  collectables: GECollectable[];

  // Search/Browse
  searchQuery: string;
  searchResults: GEItem[];
  selectedItem: GEItem | null;

  // Order Form
  orderType: 'buy' | 'sell';
  orderQuantity: number;
  orderPrice: number;
  selectedSlot: number;

  // Actions
  openGE: () => void;
  closeGE: () => void;
  setView: (view) => void;
  searchItems: (query) => void;
  selectItem: (item) => void;
  placeOrder: () => Promise<void>;
  cancelOrder: (orderId) => Promise<void>;
  collectAll: () => Promise<void>;

  // Sync
  fetchItems: () => Promise<void>;      // Initial load
  fetchOrders: () => Promise<void>;     // Refresh orders
}
```

---

## Phase 6: Frontend API Hooks

**New File**: `apps/frontend/src/components/play/marketplace/GrandExchange/hooks/useGrandExchange.ts`

```typescript
// React Query hooks
export function useGEItems() {
  return useQuery({ queryKey: ['ge', 'items'], queryFn: fetchAllItems, staleTime: 5 * 60 * 1000 });
}

export function useItemSearch(query: string) {
  return useQuery({ queryKey: ['ge', 'search', query], queryFn: () => searchItems(query), enabled: query.length > 0 });
}

export function useMarketData(itemId: string) {
  return useQuery({ queryKey: ['ge', 'market', itemId], queryFn: () => fetchMarketData(itemId) });
}

export function usePriceHistory(itemId: string, period: '24h' | '7d' | '30d') {
  return useQuery({ queryKey: ['ge', 'history', itemId, period], queryFn: () => fetchPriceHistory(itemId, period) });
}

export function useMyOrders() {
  return useQuery({ queryKey: ['ge', 'orders'], queryFn: fetchMyOrders, refetchInterval: 10000 });
}

export function useCollectables() {
  return useQuery({ queryKey: ['ge', 'collectables'], queryFn: fetchCollectables, refetchInterval: 5000 });
}

// Mutations
export function usePlaceOrder() { ... }
export function useCancelOrder() { ... }
export function useCollectItems() { ... }
```

---

## Phase 7: Frontend Components

**New Directory**: `apps/frontend/src/components/play/marketplace/GrandExchange/`

### Component Structure

```
GrandExchange/
├── GrandExchangePanel.tsx    # Main modal (copy InventoryPanel pattern)
├── GEHeader.tsx              # Title + gold balance + close button
├── GESearchBar.tsx           # Item search with autocomplete
├── GEItemCard.tsx            # Item preview with price/trend/sparkline
├── GEBuySellForm.tsx         # Buy/Sell toggle, quantity, price inputs
├── GEActiveOrders.tsx        # 6 order slots grid
├── GEOrderSlot.tsx           # Individual slot with progress bar
├── GECollectBox.tsx          # Items ready to claim
├── GETransactionHistory.tsx  # Past trades table
├── GEPriceChart.tsx          # Nivo line chart for price history
├── constants.ts              # Colors, config
├── types.ts                  # TypeScript interfaces
└── hooks/
    ├── useGrandExchange.ts   # React Query hooks
    ├── useGEStore.ts         # Re-export geStore
    └── useGESocket.ts        # Socket.io event handlers
```

### Layout (3-Panel)

```
┌──────────────────────────────────────────────────────────────────┐
│ [GRAND EXCHANGE]                           Gold: 10,000    [X]   │
├────────────────────┬─────────────────────┬───────────────────────┤
│   BROWSE/SEARCH    │    ORDER FORM       │    ACTIVE ORDERS      │
│                    │                     │                       │
│   [Search...]      │  [BUY] [SELL]       │   Slot 1: ████░░ 60%  │
│                    │                     │   Slot 2: Empty       │
│   Iron Sword       │  Quantity: [___]    │   Slot 3: ████████ ✓  │
│     Guide: 150g ↑  │  Price:    [___]    │   Slot 4: Empty       │
│                    │                     │   Slot 5: Empty       │
│   Steel Helm       │  [CONFIRM ORDER]    │   Slot 6: Empty       │
│     Guide: 300g ─  │                     │                       │
│                    │                     │   [COLLECT ALL]       │
├────────────────────┴─────────────────────┴───────────────────────┤
│              COLLECT BOX: 2 items ready to claim                 │
└──────────────────────────────────────────────────────────────────┘
```

### Styling Pattern

Use existing InventoryPanel glass-morphism:
- Background: `bg-[#12121a]/95 backdrop-blur-xl`
- Border: Gradient `from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30`
- Text: `text-gray-200` with `text-white` for emphasis
- Accent: Gold `#c9a227` for prices/currency

---

## Phase 8: Inventory Integration

### 8.1 Modify inventoryStore.ts

**File**: `apps/frontend/src/lib/economy/inventoryStore.ts`

Add server sync:
```typescript
// Add API sync
fetchInventory: async () => {
  const response = await inventoryApi.getInventory();
  set({ slots: new Map(response.slots.map(s => [s.slot, s])) });
},

// Modify existing actions to call API:
addItem: async (item, quantity) => {
  const result = await inventoryApi.addItem(item.id, quantity);
  // Update local state with server response
},
```

Add GE locking:
```typescript
lockForGE: (slotId: string, quantity: number) => {
  // Mark items as locked (can't drop/trade while on GE)
},

unlockFromGE: (slotId: string, quantity: number) => {
  // Release lock if order cancelled
},
```

### 8.2 Modify ItemContextMenu.tsx

**File**: `apps/frontend/src/components/play/inventory/ItemContextMenu.tsx`

Add "Sell on Exchange" option:
```typescript
{item.tradeable && (
  <button onClick={() => {
    useGEStore.getState().selectItem(item);
    useGEStore.getState().setOrderType('sell');
    useGEStore.getState().openGE();
  }}>
    Sell on Exchange
  </button>
)}
```

---

## Phase 9: HUD Integration

### 9.1 Add Keybinding

**File**: `apps/frontend/src/components/play/settings/useKeybindsStore.ts`

```typescript
// Add to GameAction type:
| 'grandExchange'

// Add to ACTION_LABELS:
grandExchange: 'Open Grand Exchange',

// Add to ACTION_CATEGORIES:
Marketplace: ['grandExchange'],

// Add to DEFAULT_KEYBINDS:
grandExchange: [{ type: 'keyboard', code: 'KeyG', display: 'G' }],
```

### 9.2 Add to PlayPage

**File**: `apps/frontend/src/pages/PlayPage.tsx`

```typescript
const [showGrandExchange, setShowGrandExchange] = useState(false);

// In keyboard handler:
if (isAction('grandExchange', e.code)) {
  setShowGrandExchange(prev => !prev);
}

// In JSX:
{showGrandExchange && (
  <GrandExchangePanel
    isOpen={true}
    onClose={() => setShowGrandExchange(false)}
  />
)}
```

### 9.3 Add HUD Icon (Optional)

Add GE icon near inventory button with badge showing collectable count.

---

## Phase 10: Anti-Manipulation Features

| Feature | Implementation |
|---------|----------------|
| Trade limits | Max quantity per 4-hour window per item per user (GETradeLimit) |
| VWAP smoothing | `newPrice = 0.8 * oldGuide + 0.2 * calculated` prevents single-trade manipulation |
| Price bounds | Optional min/max price per item in GEItem |
| Order expiration | 7-day auto-expire via scheduled job |
| Rate limiting | Use existing rate-limit.middleware.ts |

---

## Critical Files Summary

| File | Action |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add 7 models + enums |
| `apps/backend/src/services/ge.service.ts` | **NEW** - Order matching, VWAP |
| `apps/backend/src/services/inventory.service.ts` | **NEW** - Server inventory CRUD |
| `apps/backend/src/routes/ge.routes.ts` | **NEW** - GE REST API |
| `apps/backend/src/routes/inventory.routes.ts` | **NEW** - Inventory REST API |
| `apps/backend/src/socket/index.ts` | Add GE events |
| `apps/backend/src/index.ts` | Register new routes |
| `apps/frontend/src/lib/economy/geStore.ts` | **NEW** - Zustand store |
| `apps/frontend/src/lib/economy/inventoryStore.ts` | Add server sync + GE locking |
| `apps/frontend/src/components/play/marketplace/GrandExchange/` | **NEW** - All UI components |
| `apps/frontend/src/components/play/inventory/ItemContextMenu.tsx` | Add "Sell on Exchange" |
| `apps/frontend/src/components/play/settings/useKeybindsStore.ts` | Add grandExchange action |
| `apps/frontend/src/pages/PlayPage.tsx` | Add GE panel + keybind |

---

## Implementation Order

1. **Phase 0** - Server inventory (prerequisite, blocks everything else)
2. **Phase 1** - Database schema + migration
3. **Phase 2** - Backend services (ge.service, inventory.service)
4. **Phase 3** - API routes
5. **Phase 4** - Socket events
6. **Phase 5-6** - Frontend store + hooks
7. **Phase 7** - UI components
8. **Phase 8-9** - Integrations (inventory, HUD)
9. **Phase 10** - Anti-manipulation polish

---

## Notes

- Phase 0 (server inventory) is the biggest undertaking since it changes the fundamental architecture
- Consider implementing Phase 0 first as a separate PR to reduce risk
- The GE UI can be built in parallel with backend work using mock data
- Nivo charts are already available for price history visualization
