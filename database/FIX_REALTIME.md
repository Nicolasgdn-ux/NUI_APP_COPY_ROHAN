# 🔧 FIX REAL-TIME UPDATES - Guide Complet

## 🚨 PROBLÈME
- Les commandes n'apparaissent pas en temps réel dans "Table X Orders" (client)
- La page Orders du restaurant ne se met pas à jour automatiquement
- Il faut rafraîchir la page pour voir les nouvelles commandes

## 🎯 SOLUTION

### Étape 1 : Activer Realtime dans Supabase (OBLIGATOIRE)

**Via SQL Editor :**
```sql
-- Activer la réplication en temps réel pour la table orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Vérifier que c'est activé
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
-- Résultat attendu : une ligne avec 'orders' doit apparaître
```

**OU via l'interface Supabase (Alternative) :**
1. Allez dans **Database** → **Replication**
2. Trouvez la table `orders`
3. Cochez la case **"Enable Realtime"**
4. Cliquez sur **Save**

---

### Étape 2 : Vérifier les RLS Policies (déjà fait normalement)

Les policies doivent permettre la lecture publique :
```sql
-- Vérifier que cette policy existe
SELECT policyname FROM pg_policies WHERE tablename = 'orders';
-- Résultat attendu : "enable_read_access_for_all"
```

Si elle n'existe pas, exécutez :
```sql
CREATE POLICY "enable_read_access_for_all" 
ON orders FOR SELECT 
USING (true);
```

---

### Étape 3 : Tester le Real-time

**Test 1 : Console JavaScript (dans le navigateur)**

Ouvrez la console du navigateur (F12) et testez :

```javascript
// Remplacez par votre URL et key Supabase
const supabase = window.supabase || createClient('YOUR_URL', 'YOUR_ANON_KEY');

const subscription = supabase
  .channel('test-orders')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => {
      console.log('🔥 REALTIME UPDATE:', payload);
    }
  )
  .subscribe((status) => {
    console.log('📡 Subscription status:', status);
  });

// Vous devriez voir "📡 Subscription status: SUBSCRIBED"
// Ensuite, créez une commande et vous devriez voir "🔥 REALTIME UPDATE: ..."
```

**Test 2 : Vérifier dans l'app**

1. Ouvrez le menu client : `http://localhost:5173/menu/YOUR_SLUG?table=2`
2. Ouvrez la console du navigateur (F12)
3. Commandez un plat
4. Regardez la console - vous devriez voir les messages de subscription

---

## 🐛 DIAGNOSTIC

### Si ça ne marche toujours pas après avoir activé Realtime :

**Vérifiez dans la console du navigateur :**

```javascript
// Ouvrez la console et tapez :
localStorage.getItem('supabase.auth.token')
```

Si c'est `null`, c'est normal - vous n'êtes pas authentifié. Les policies RLS doivent permettre l'accès public.

**Vérifiez les WebSockets :**
1. Ouvrez F12 → Onglet **Network**
2. Filtrez par **WS** (WebSocket)
3. Vous devriez voir une connexion WebSocket à Supabase
4. Si la connexion est **rouge** ou **fermée**, il y a un problème de connexion

---

## 📋 CHECKLIST

- [ ] Exécuter `ALTER PUBLICATION supabase_realtime ADD TABLE orders;`
- [ ] Vérifier que `orders` apparaît dans `pg_publication_tables`
- [ ] Vérifier les RLS policies avec `SELECT * FROM pg_policies WHERE tablename = 'orders';`
- [ ] Tester avec la console JS
- [ ] Commande une commande et vérifier qu'elle apparaît automatiquement
- [ ] Vérifier la console du navigateur pour les erreurs

---

## ⚡ SI ÇA NE MARCHE TOUJOURS PAS

### Option 1 : Polling (fallback)

Si Realtime ne fonctionne vraiment pas, on peut utiliser le polling :

```typescript
// Dans CustomerMenu.tsx, au lieu de subscribeToTableOrders
useEffect(() => {
  if (!restaurant?.id || !isTableOrder) return;

  const pollOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', tableId)
      .eq('is_paid', false)
      .order('created_at', { ascending: false });

    if (data) setTableOrders(data);
  };

  pollOrders(); // Initial fetch
  const interval = setInterval(pollOrders, 3000); // Poll every 3s

  return () => clearInterval(interval);
}, [restaurant, tableId, isTableOrder]);
```

Mais **utilisez ceci uniquement en dernier recours** car ça consomme plus de ressources.

---

## 🎯 RÉSUMÉ

**Le problème principal : Realtime n'est pas activé sur la table `orders`**

**La solution :**
1. Exécutez `ALTER PUBLICATION supabase_realtime ADD TABLE orders;`
2. Redémarrez votre app (parfois nécessaire)
3. Testez en commandant un plat

C'est tout ! Une fois Realtime activé, tout devrait fonctionner instantanément. 🚀
