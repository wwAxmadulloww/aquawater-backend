# AquaWater — Figma prompt

Paste the block below into Figma AI / Figma Make. It is written in English
because that is what the tool parses most reliably; every string the user sees
is given in Uzbek and must be used verbatim.

---

## PROMPT

You are designing the complete UI for **AquaWater**, a live drinking-water
delivery service operating in Tashkent, Uzbekistan. This is not a concept —
the product is in production with real customers, real couriers and a real
catalogue. Design for the business as it actually works.

### 1. What the business does

Customers order bottled drinking water to their home or office. A courier
delivers it, collects cash at the door, and takes back the empty containers.
Some customers keep a standing weekly order. The service runs on a website, a
Telegram Mini App, and an admin panel the owner uses from a phone.

The catalogue is water only. These are the products that matter:

| Product | Price | Container |
|---|---|---|
| 19L Suv idishi | 25 000 so'm | returnable, container costs 35 000 to buy |
| 10L Suv idishi | 15 000 so'm | returnable, container costs 25 000 to buy |
| Suv (idishsiz) | 10 000 so'm | none — customer brings their own bottle |

Design the catalogue to sit comfortably at four to eight products: it is a
short list on purpose and must not look sparse, but it will grow.

The defining mechanic: on every returnable product the customer chooses
**«Qaytaraman»** (returns the container — cheaper, the container is counted
against them until they hand it back) or **«Sotib olaman»** (buys the container
— 19L becomes 60 000 so'm, nothing is owed). This choice must be a first-class,
unmissable element of the design, not a checkbox.

### 2. Art direction

**Light, airy, water.** The current build is a dark midnight-blue theme; replace
it with a bright one that feels like clean water in daylight — the emotional
target is *freshness and trust*, not *tech startup*.

Reference feeling: sunlight through a glass of water; the pale blue of a pool
seen from above; condensation on a cold bottle. Avoid: neon, cyberpunk,
brutalism, dark mode as the default, purple-to-pink gradients, generic SaaS.

**Colour system** — use these exact values as Figma variables:

```
Canvas / background
  --bg-base        #F4FAFF   page background, a barely-there blue
  --bg-elevated    #FFFFFF   cards, sheets, inputs
  --bg-sunk        #EAF4FE   table headers, disabled fields, wells

Brand — water blue
  --blue-50        #EAF4FE
  --blue-100       #CFE6FD
  --blue-200       #9DCCFB
  --blue-300       #5EAEF8
  --blue-500       #1B7CF5   PRIMARY — buttons, links, active states
  --blue-600       #0A62D6   hover / pressed
  --blue-800       #0B3E85   headings on light backgrounds
  --blue-950       #0B2545   body text (never pure black)

Water accent — for droplets, highlights, 3D lighting
  --aqua-300       #6FE3FF
  --aqua-500       #35C8F0

Semantic
  --green-500      #12B76A   delivered, paid, in stock
  --amber-500      #F79009   pending, unverified stock count
  --red-500        #F04438   cancelled, unpaid, destructive
  --grey-400       #98A6B8   secondary text
  --grey-200       #E3EAF2   hairlines, dividers
```

Rules: never pure black text — use `--blue-950`. Never a flat grey page — use
`--bg-base`. One accent only; `--blue-500` is the single colour that says
"press me".

**Signature gradients** (define as Figma styles):
- *Water wash*: 180° linear, `#FFFFFF` → `#EAF4FE`, for section backgrounds.
- *Deep water*: 135° linear, `#1B7CF5` → `#35C8F0`, for the primary CTA and the
  hero's 3D lighting.
- *Glass*: white at 60% opacity + 24px background blur + 1px inner stroke at
  `#FFFFFF` 70% — for cards that float over the 3D scene.

**Typography** — Inter Tight (or Inter) throughout, one family only.

```
Display   64 / 68   -2% tracking   600   hero headline
H1        40 / 46   -1.5%          600
H2        30 / 38   -1%            600   section titles
H3        20 / 28   -0.5%          600   card titles
Body      16 / 26    0%            400
Small     14 / 22    0%            400   metadata
Caption   12 / 18   +4%            500   UPPERCASE eyebrows
Numeric   use tabular figures for every price and quantity
```

Prices are always `25,000 so'm` — space-separated thousands, lowercase `so'm`.

**Shape and depth**
- Radius: 12px inputs and small controls, 20px cards, 28px sheets and modals,
  full-round for pills and avatars.
- Shadows are blue-tinted, never grey:
  `0 1px 2px rgba(11,37,69,.04)`, `0 8px 24px rgba(11,37,69,.08)`,
  `0 24px 48px rgba(27,124,245,.16)` for the floating CTA.
- Generous whitespace. Section padding 96px desktop / 56px mobile.

### 3. The 3D element — the centrepiece

The hero must contain a **real-time 3D water scene that reacts to scroll and
cursor**, not a static illustration.

Figma cannot render true 3D. Produce the design in three deliverables:

1. **In Figma**: the hero frame with the 3D scene represented as a high-quality
   placeholder image plus a labelled layer named `3D-SCENE / see Spline file`,
   and a documented spec of the motion (below). Build every state and overlay
   around it properly.
2. **A separate Spline (or Rive) scene** for the actual 3D.
3. **A prototype** in Figma using Smart Animate that communicates the intended
   motion to the developer.

**Scene description** — a 19L water bottle, rendered in frosted translucent
glass, three-quarter view, floating slightly above centre-right of the hero.
Inside it, real-looking water with a visible surface that sloshes. Light comes
from the upper left, cool daylight, producing caustic refractions that fall on
the page background behind the bottle. Two or three droplets orbit slowly.
Materials: glass with 0.9 transmission and slight roughness; water tinted
`#35C8F0` at low saturation; no chrome, no metal, no dark studio background —
the scene sits on the light page.

**Motion**, all of it easing `cubic-bezier(.22,.61,.36,1)`:

| Trigger | Behaviour |
|---|---|
| Page load | Bottle rises 40px and fades in over 900ms; water settles for a further 600ms |
| Idle | Slow Y-axis rotation, one revolution per 40s; water surface breathes ±2px |
| Cursor move | Bottle tilts up to 8° toward the pointer, spring-damped, returns to rest after 1.2s |
| Scroll through hero | Bottle rotates 45° and scales to 0.75 as the page moves down; the water level *drops*, as though being poured out |
| Scroll into product section | Two more bottles (10L, and a plain one) fly in from the sides and settle into the product cards |
| Hover on a product card | That card's bottle lifts 8px and its water ripples once |
| Add to cart | A droplet detaches, arcs to the cart icon in the header, and the cart badge bounces |

Everything must respect `prefers-reduced-motion`: the whole scene freezes to a
still frame, no parallax, no orbit.

Also design a **static fallback** hero for low-end devices and slow connections
— the 3D is progressive enhancement, never a blocker to ordering water.

### 4. Screens to design

Design every one of these, in **desktop (1440)** and **mobile (390)**, light
theme. Uzbek copy exactly as given.

**Customer**

1. **Home** `/` — hero with the 3D scene, headline «Toza suv — Uyingizga
   yetkazib!», subtitle «Toshkent va Uzbekiston bo'ylab toza ichimlik suvini
   tez va qulay yetkazib beramiz.», primary CTA «Buyurtma berish», secondary
   «Mahsulotlarni ko'rish». Floating glass stat chips over the scene: «Eng arzon
   — 10 000 so'm», «Ish vaqti 09:00–18:00», «1 ta filial». Then: featured
   products («Tanlovimiz»), how it works in three steps («Uch qadam»), trust
   figures pulled live from the database («Aytmaymiz — ko'rsatamiz» — delivered
   orders, customers served, months in operation), branches on a map
   («Bizning filiallarimiz»), payment methods («Naqd, Click yoki Payme»).

2. **Catalogue** `/products` — four products, sort control only (no category
   filter — everything is water). Card shows photo, name, price, a
   «idish qaytariladi» tag on returnable items, stock state, quick-add.

3. **Product detail** `/products/:id` — large 3D-ready product view, price,
   description, quantity stepper, **the container choice as two large priced
   cards side by side** (♻️ Qaytaraman 25 000 so'm/dona · 📦 Sotib olaman
   60 000 so'm/dona) with a one-line explanation under each, add to cart,
   related products.

4. **Cart** `/cart` — line items each carrying the container choice inline,
   quantity steppers, subtotal. The delivery line must read «Manzilga qarab
   hisoblanadi» — never a fake zero.

5. **Checkout** `/checkout` — address form (Viloyat select showing the fee per
   region, Shahar, Tuman, Ko'cha, Uy raqami, Xonadon), delivery date and one of
   five time slots, a «Har hafta shu buyurtma takrorlansin» toggle for standing
   orders, payment method (Naqd pul / Click / Payme), and a sticky summary
   showing goods, delivery charge and total.

6. **Order placed** — confirmation with a large order code `#3FE25E`.

7. **My orders** `/orders` — a strip at the top when the customer holds
   containers: «Sizda 3 ta idish turibdi — keyingi yetkazishda kuryerga
   bering.» Each order card: status pill, code, items, dates, total, payment
   state, and per-order container facts («♻️ 3 ta idish qaytarilishi kerak»,
   «📦 2 ta idish sotib olindi», «✅ 1 ta bo'sh idish qaytarib olindi»), plus a
   cancel action while the order is still `pending`/`confirmed`.

8. **My containers & standing orders** `/subscriptions` — the container balance
   with the ledger of movements behind it, and the weekly standing orders with
   pause / resume / delete.

9. **Profile** `/profile` — name, phone, language (O'z / Рус / Eng), logout,
   and a clearly-separated destructive «Akkauntni o'chirish».

10. **Login / register** `/login` — phone and password, two tabs.

11. **Legal** `/legal/oferta`, `/legal/maxfiylik` — long-form document layout,
    comfortable measure (max 68 characters), clear heading hierarchy.

**Courier** `/courier` — phone-first. One card per stop: address, tappable
phone, items, what to expect for containers («♻️ Bu buyurtma: 3 ta
qaytariladigan idish», «🫙 Mijozda hozir 3 ta idish bor»), amount to collect,
an empties count field, a «Pul olinmadi» exception checkbox, and two large
actions: «Yo'lga chiqdim», «Yetkazildi».

**Admin** `/admin` — sidebar on desktop, drawer on mobile. Nine sections:
Statistika, Mahsulotlar, Buyurtmalar, Foydalanuvchilar, Filiallar, Hisobotlar,
Idishlar, Yetkazish, Doimiy. Design in detail:
- **Statistika**: KPI cards, revenue sparkline.
- **Buyurtmalar**: a data table on desktop; **on mobile, one card per order**
  with the courier and status selects reachable without horizontal scrolling.
- **Hisobotlar**: date range, revenue by day chart, by courier, by product,
  CSV export, and a distinct panel «Kuryerlarda turgan naqd pul» listing each
  courier's uncollected cash with a «Kassaga qabul qilindi» action.
- **Mahsulotlar**: product form with an **image upload from the device**
  (drag-and-drop plus camera on mobile) — no URL field — and a stocktake
  control that takes an absolute count.
- **Idishlar**: depot totals and the chase list of who is holding containers.

### 5. Component library

Build these as Figma components with variants and use them everywhere:

Button (primary / secondary / ghost / danger × default, hover, pressed,
loading, disabled × sm, md, lg) · Input, Select, Textarea (default, focus,
error, disabled, with helper text) · Checkbox, Radio, Toggle · Status pill
(pending, confirmed, assigned, in_transit, delivered, cancelled — each with its
semantic colour) · Payment pill (paid / unpaid) · Product card · Order card ·
Stat card · Quantity stepper · Container-choice card (selected / unselected) ·
Empty state · Loading skeleton · Toast · Modal · Bottom sheet (mobile) ·
Header (logged out / customer / staff) · Footer · Sidebar nav item · Data table
row · Pagination · Language switcher.

Also: an **icon set** — outline, 1.5px stroke, 24px grid, rounded caps — for
water drop, bottle, truck, container/return, calendar, repeat, wallet, phone,
map pin, clock.

### 6. Non-negotiables

- **Uzbek first.** Uzbek is longer than English; every button and label must
  hold `Buyurtma rasmiylashtirish` without truncating. Design for uz, then
  check ru and en.
- **Mobile is the primary device.** Most customers and every courier are on a
  phone, often on a slow connection. Tap targets ≥ 44px.
- **Never show a control that does nothing.** No decorative filters, no social
  links to nowhere, no "coming soon".
- **Never invent data.** No fake reviews, no fake counters, no stock photos of
  smiling models. Trust figures come from the database.
- **Accessibility**: 4.5:1 minimum contrast for text — check `--blue-500` on
  white and on `--bg-base`. Visible focus rings. Every icon-only button has a
  label.
- **Empty, loading and error states for every screen**, not just the happy
  path.

### 7. Deliverables

1. A Figma file with pages: `01 Foundations` (colour, type, spacing, shadows,
   icons), `02 Components`, `03 Customer — Desktop`, `04 Customer — Mobile`,
   `05 Courier`, `06 Admin`, `07 Prototype`.
2. Figma variables for the full colour system, with a dark mode defined as a
   second mode (not the default — the default is light).
3. A clickable prototype covering: home → product → container choice → cart →
   checkout → confirmation, and the courier's delivery flow.
4. The motion spec from section 3, written as developer notes on the hero
   frame.
5. A Spline or Rive scene file for the 3D bottle.

Start with `01 Foundations`, then the Home hero, then work outward.
