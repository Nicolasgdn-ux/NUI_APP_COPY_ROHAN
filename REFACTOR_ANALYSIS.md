# QR Code Table Identification Refactor - Impact Analysis

## Overview
Refactoring CustomerMenu.tsx to extract table ID from URL query parameters (`?table=12`) instead of manual user input.

---

## Files to Modify

### 1. **src/pages/customer/CustomerMenu.tsx** (PRIMARY)
**Changes Required:**

#### Imports
- Add `useSearchParams` from `react-router-dom`

#### State Changes
- **Remove:**
  - `orderType` state (currently defaults to "table")
  - `tableNumber` state (currently empty string)
  
- **Add:**
  - Extract `table` from query params using `useSearchParams`
  - Create constant `tableId` with fallback logic:
    ```
    const tableId = tableParam || "Takeaway"
    const isTableOrder = tableId !== "Takeaway"
    ```

#### Checkout Flow Changes
- **Remove:**
  - Manual table number `<Input />` field (lines ~804-809)
  - Manual `orderType` radio buttons (lines ~780-796)
  - Validation check for `tableNumber` (line ~694-695)
  - Form reset logic for `tableNumber` and `orderType` (lines ~743, ~745)

- **Update:**
  - Display detected `tableId` in modal header as read-only info
  - Pass `tableId` automatically to `createOrder()` instead of user-selected value
  - Update order submission to always set:
    - `order_type: tableId === "Takeaway" ? "counter" : "qr"`
    - `table_number: tableId === "Takeaway" ? undefined : tableId`

#### Validation Changes
- **Remove:** Table number validation (empty check)
- **Keep:** Name and phone validation

#### Sample Changes
```tsx
// Before
const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
const [tableNumber, setTableNumber] = useState("");

// After
const [searchParams] = useSearchParams();
const tableParam = searchParams.get("table");
const tableId = tableParam || "Takeaway";
const isTableOrder = tableId !== "Takeaway";
```

---

### 2. **src/pages/restaurant/RestaurantSettings.tsx** (OPTIONAL - RECOMMENDED)
**Changes Required:**

#### QR Code Generation Enhancement
Current state (line 90):
```tsx
const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;
```

**Add Table-Specific QR Codes:**
- Create a section for "Table-Specific QR Codes"
- Allow restaurant owner to generate individual QR codes for each table
- Each QR code should include the table parameter:
  ```
  /menu/{slug}?table={tableNumber}
  ```

**New Feature:**
- Input field for table number range (e.g., 1-10)
- "Generate Table QR Codes" button
- Display QR codes in a grid with table labels
- Option to download all as a PDF or ZIP

---

### 3. **Database Schema / Supabase Types** (NO CHANGES NEEDED)
✅ Current `Order` interface already has:
- `table_number?: string` - stores the table ID
- `order_type: "qr" | "counter"` - indicates if order came from QR

✅ Current `OrderItem` interface already supports:
- `selected_price`
- `price_type`

---

## Impact on Other Components

### 4. **src/pages/restaurant/Orders.tsx** (DEPENDENT - VERIFY ONLY)
**Current Usage (line 201):**
```tsx
{order.table_number && `Table ${order.table_number}`}
```

✅ **No changes needed** - Already displays table info correctly

**Recommendation:**
- Verify that "Takeaway" orders display properly (when `table_number` is undefined)
- Add visual indicator to distinguish QR vs Counter orders

---

### 5. **src/App.tsx** (NO CHANGES NEEDED)
✅ Route already supports URL parameters:
```tsx
<Route path="/menu/:slug" element={<CustomerMenu />} />
```
- React Router will pass query params via `useSearchParams`

---

### 6. **src/services/restaurantService.ts** (NO CHANGES NEEDED)
✅ `createOrder()` function already accepts:
```tsx
order_type: "qr" | "counter"
table_number?: string
```

---

## URL Format Examples

| Scenario | URL | Result |
|----------|-----|--------|
| QR Code at Table 5 | `/menu/my-restaurant?table=5` | Order Type: QR, Table: 5 |
| QR Code at Table 12 | `/menu/my-restaurant?table=12` | Order Type: QR, Table: 12 |
| No table param (takeaway) | `/menu/my-restaurant` | Order Type: Counter, Table: undefined |
| Counter menu | `/menu/my-restaurant?table=counter` | Order Type: Counter, Table: "counter" |

---

## Edge Cases to Handle

1. **Invalid table numbers** (non-numeric):
   - Accept any string (e.g., "VIP1", "patio-table-3")
   - Store as-is in database

2. **Empty table parameter**:
   - Treat as takeaway order
   - Default to "Takeaway" display

3. **User changes browser URL**:
   - Extract table param on component mount
   - Update if URL changes (use dependency in useEffect)

4. **QR code generation for specific tables**:
   - Add feature in RestaurantSettings for bulk QR generation
   - One QR per table with ?table=N parameter embedded

---

## Testing Checklist

- [ ] Extract table ID from URL query params correctly
- [ ] Fallback to "Takeaway" when no table param
- [ ] Order submission includes correct `table_number` value
- [ ] Order submission includes correct `order_type` ("qr" or "counter")
- [ ] Modal displays table ID (read-only)
- [ ] Remove all unused state variables (tableNumber, orderType)
- [ ] No TypeScript errors about undefined states
- [ ] Restaurant dashboard correctly displays table info in orders
- [ ] Takeaway orders display without table number

---

## Rollback Plan

If issues arise:
1. Revert CustomerMenu.tsx changes
2. Restore `orderType` and `tableNumber` state
3. Re-enable manual input fields

---

## Summary of Changes by File

| File | Type | Impact |
|------|------|--------|
| `CustomerMenu.tsx` | MODIFY | Remove manual table input, auto-detect from URL |
| `RestaurantSettings.tsx` | ENHANCE | Add table-specific QR code generator (optional) |
| `Orders.tsx` | VERIFY | Confirm table display works correctly |
| `App.tsx` | NONE | No changes |
| `restaurantService.ts` | NONE | No changes |
| `supabase.ts` | NONE | No changes |

