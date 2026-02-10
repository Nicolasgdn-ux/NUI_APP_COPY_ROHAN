# 🔍 AUDIT COMPLET DU FLUX DE COMMANDE

## 📋 Flux Décrit par l'Utilisateur

```
CLIENT → SCANNE QR → MENU → SÉLECTIONNE PLATS → PANIER → COMMANDE
                                                              ↓
                                                    CUISINE REÇOIT
                                                              ↓
                                            CUISINIER PRÉPARE + OK
                                                              ↓
                                              KITCHEN DASHBOARD:
                                         • Vue toutes tables
                                         • Montant par table
                                         • Paiement → Facture réglée
                                         • Réinitialise + Historique BD
```

---

## ✅ CE QUI EXISTE DÉJÀ

### 1. **CLIENT - Menu & Commande** ✅ COMPLET
📁 `src/pages/customer/CustomerMenu.tsx`
- ✅ Scannage QR → URL avec `?table=5`
- ✅ Extraction automatique du table_id
- ✅ Session ID unique généré par client
- ✅ Menu avec items
- ✅ Sélection tailles (fruits de mer, viande, etc.)
- ✅ Sélection add-ons
- ✅ Panier complet (ajouter/retirer)
- ✅ Checkout simplifié (sans nom/phone)
- ✅ Envoi à BD avec `session_id + table_id`

**Données envoyées:**
```json
{
  "restaurant_id": "...",
  "order_type": "qr",
  "table_number": "5",
  "session_id": "1707532845123-f3a9k2m1",
  "items": [...],
  "subtotal": 100,
  "tax": 5,
  "total": 105,
  "customer_notes": "..."
}
```

### 2. **CUISINE - Réception & Gestion** ✅ PARTIELLEMENT
📁 `src/pages/restaurant/Orders.tsx`
- ✅ Récupère commandes en temps réel (WebSocket)
- ✅ Affiche les commandes par statut
- ✅ Filtre: pending, accepted, completed, cancelled
- ✅ Affiche table_number
- ✅ Affiche montant total
- ✅ Boutons: Accept, Mark Complete
- ✅ Notification sonore pour nouvelles commandes
- ✅ Trier par FIFO (ancien d'abord)

**Statuts supportés:**
- pending → accepted → preparing → ready → completed

### 3. **BASE DE DONNÉES** ✅ EXISTANTE
📁 `database/setup.sql`
- ✅ Table `orders` avec tous les champs
- ✅ `session_id` PEUT être ajouté
- ✅ `table_number` existe
- ✅ `status` avec tous les statuts
- ✅ `created_at` pour historique

---

## ❌ CE QUI MANQUE

### 1. **KITCHEN DASHBOARD - Vue Synthétique des Tables** ❌
**Besoin:** Interface montrant:
- [ ] Toutes les tables avec commandes actives
- [ ] Montant par table
- [ ] Status préparation par table
- [ ] Vue en temps réel (grille/tableau)

**Exemple:**
```
TABLE 1    | 2 commandes | 45 EUR | 🟡 Preparing
TABLE 2    | 1 commande  | 23 EUR | 🟢 Ready
TABLE 5    | 3 commandes | 98 EUR | 🔴 Pending
```

### 2. **KITCHEN WORKFLOW - Préparation Détaillée** ⚠️
**Problème:** Statut `preparing` n'est pas utilisé
- [ ] Accept commande → passe à "preparing"
- [ ] Interface spéciale pour cuisinier:
  - [ ] Afficher TOUS les items de la commande
  - [ ] Cocher items au fur et à mesure
  - [ ] Quand TOUS checkés → status "ready"
  - [ ] Bouton "Mark Complete" pour passer à suivante

**Exemple de workflow:**
```
Commande #123 - Table 5
[ ] Burger
[ ] Frites
[ ] Boisson

Quand tout est coché → auto "ready" ou manuel
```

### 3. **PAYMENT - Gestion du Paiement** ❌
**Besoin:**
- [ ] Interface spéciale pour paiement
- [ ] Vue de la table → montant exact
- [ ] Bouton "Payment Complete" ou "Mark Paid"
- [ ] Status passage à "completed"
- [ ] Réinitialisation table pour nouvelles commandes

### 4. **TABLE OVERVIEW - Dashboard Cuisine Complet** ❌
**Besoin:** Page dédiée pour cuisine/caisse avec:
- [ ] Vue grille de toutes les tables
- [ ] Pour chaque table:
  - [ ] Numéro table
  - [ ] Status commandes (pending/preparing/ready)
  - [ ] Montant total
  - [ ] Nombres d'articles
  - [ ] Bouton "Payment" ou "Complete"
- [ ] Filtrer par status
- [ ] Trier par ordre d'arrivée

### 5. **SESSION_ID DANS BD** ⚠️
**Besoin:** Ajouter colonne `session_id` à table orders
```sql
ALTER TABLE orders ADD COLUMN session_id TEXT;
```
Déjà prêt dans le code TypeScript, pas encore en BD.

### 6. **PRICE_TYPE DANS ITEMS** ⚠️
**Besoin:** Supporter "fruits de mer" vs "viande"
- [ ] MenuItem avec `price_seafood` vs `price_chicken_pork`
- [ ] OrderItem avec `price_type: "seafood" | "chicken_pork"`
- Déjà existe dans `MenuItem` mais pas utilisé dans logic

---

## 📊 STATUTS ET WORKFLOW

### État actuel:
```
pending
    ↓
accepted
    ↓
[MANQUE: preparing/ready avec détails]
    ↓
completed
```

### État attendu:
```
pending (client commande)
    ↓
accepted (cuisine accepte)
    ↓
preparing (cuisine en train de préparer)
    ↓
ready (prêt à servir, paiement)
    ↓
completed (payé, fini)
```

---

## 🛠️ TODO PRIORITAIRE

### P0 - CRITIQUE (Flux fonctionne mais basique):
1. [ ] Ajouter `session_id` dans migration BD
2. [ ] Créer **Kitchen Table Overview** (nouvelle page/vue)
   - Grille de toutes les tables actives
   - Montant par table
   - Status
3. [ ] Créer **Payment Interface** (modal/page)
   - Affiche montant table
   - Bouton "Payment Complete"

### P1 - IMPORTANT (Améliore UX cuisine):
4. [ ] Ajouter statut `preparing` dans workflow
5. [ ] Détailler items avec checkboxes
6. [ ] Auto-transition ready quand tous items checked
7. [ ] Améliorer Orders.tsx pour afficher prix_type

### P2 - NICE-TO-HAVE:
8. [ ] Support complet price_seafood vs price_chicken_pork
9. [ ] Statistiques par table
10. [ ] Historique des tables (archives)

---

## 💾 MIGRATION BD REQUISE

```sql
-- Ajouter session_id
ALTER TABLE orders ADD COLUMN session_id TEXT;
CREATE INDEX idx_orders_session_id ON orders(session_id);

-- Ajouter status preparing/ready si pas déjà
-- Vérifier CHECK constraint sur status
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check,
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'));
```

---

## 📱 INTERFACES À CRÉER

### 1. **Kitchen Dashboard (NEW)**
Route: `/restaurant/kitchen` ou tab "Kitchen"

Affiche:
- [ ] Vue synthétique tables
- [ ] Commandes par table
- [ ] Montants
- [ ] Status
- [ ] Temps préparation

### 2. **Payment Modal (NEW)**
Trigger: Depuis Kitchen Dashboard

Affiche:
- [ ] Montant table
- [ ] Items commandés
- [ ] Option paiement
- [ ] Bouton "Mark Paid"

### 3. **Item Preparation Checklist (UPDATE)**
Dans Orders.tsx detail modal

Affiche:
- [ ] Liste items avec checkboxes
- [ ] Cocher au fur et à mesure
- [ ] Auto-status "ready" quand complete

---

## 🔄 FLUX FINAL ATTENDU

```
1. CLIENT
   Scanne QR → ?table=5
   Menu → Items avec prix (standard/seafood/viande)
   Panier → Commande
   
2. KITCHEN REÇOIT
   Notification sonore
   Commande apparaît dans Orders (pending)
   
3. KITCHEN WORKFLOW
   Accept → Status "accepted"
   Voir détails items
   Préparer items
   Cocher items au fur et à mesure
   Quand tous cochés → "ready"
   
4. PAIEMENT
   Table vient à caisse
   Cuisinier/serveur affiche montant
   Marque comme payé → "completed"
   Table effacée de la vue active
   
5. HISTORIQUE
   Commande conservée en BD
   Visible en Reports/Analytics
   Restaurable si besoin
```

---

## 📝 RÉSUMÉ

| Feature | Status | Notes |
|---------|--------|-------|
| QR Code Scanning | ✅ | Fonctionne |
| Menu Browsing | ✅ | OK |
| Cart System | ✅ | OK |
| Order Submission | ✅ | OK |
| Kitchen Receipt | ✅ | OK |
| Order Management | ⚠️ | Basique, manque details |
| Table Overview | ❌ | À CRÉER |
| Payment System | ❌ | À CRÉER |
| session_id | ⚠️ | Code OK, BD manque |
| Price Types | ⚠️ | Existe mais non utilisé |
| Preparing Status | ⚠️ | Existe mais non utilisé |
| Item Checklist | ❌ | À CRÉER |

---

## ❓ QUESTIONS CLARIFICATION

1. **Items checklist:** Besoin que cuisinier coche chaque item (burger, frite, boisson) séparément?
2. **Multiple séances table:** Si table 5 a 4 personnes, chaque personne a session_id différente - faut-il les regrouper ou séparer?
3. **Paiement:** Un client paye pour toute la table ou par session?
4. **Serveur:** Quelqu'un prend les commandes ou juste client?

