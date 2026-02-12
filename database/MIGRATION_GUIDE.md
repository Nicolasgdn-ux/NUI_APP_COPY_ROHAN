# 🚀 GUIDE DE MIGRATION - Table Orders

## ⚠️ AVANT DE COMMENCER

1. **Supprimez toutes les données** de la table `orders` dans Supabase
2. **Assurez-vous d'avoir une sauvegarde** (au cas où)

## 📋 ÉTAPES À SUIVRE

### Étape 1 : Supprimer les données
Dans Supabase → Table Editor → orders → Sélectionnez toutes les lignes → Delete

Ou via SQL :
```sql
DELETE FROM orders;
```

### Étape 2 : Exécuter le script de fix
1. Ouvrez **Supabase → SQL Editor**
2. Créez une nouvelle query
3. Copiez le contenu de `/database/fix_orders_table.sql`
4. Cliquez sur **Run**

### Étape 3 : Vérifier que tout fonctionne
Le script affichera automatiquement :
- ✅ La structure de la table mise à jour
- ✅ Les index créés
- ✅ Les politiques RLS actives

### Étape 4 : Tester l'application
1. Allez sur votre menu client (avec `?table=6`)
2. Commandez 2-3 plats
3. Vérifiez qu'ils apparaissent dans le résumé de la table
4. Dans la vue Restaurant → Orders, cliquez sur "Finished"
5. Vérifiez que le statut change à "completed"
6. Dans la vue Tables, cliquez sur "Already Paid"

## 🎯 CE QUI A ÉTÉ CORRIGÉ

### ✅ Colonnes rendues NOT NULL
- `restaurant_id` - Obligatoire maintenant
- `order_type` - Obligatoire avec default 'qr'
- `status` - Obligatoire avec default 'pending'
- `is_paid` - Obligatoire avec default false
- `created_at` - Obligatoire avec default NOW()

### ✅ Auto-génération de order_number
- Format : `ORD-20260212-0001`
- Se génère automatiquement via un trigger
- Incrémente chaque jour

### ✅ Index créés pour performance
- Sur `restaurant_id` (requêtes par restaurant)
- Sur `table_number` (requêtes par table)
- Sur `status` (filtrage pending/completed)
- Sur `is_paid` (requêtes unpaid)
- Index composite pour optimiser la requête la plus fréquente

### ✅ Politiques RLS permissives
- Tout le monde peut lire (SELECT)
- Tout le monde peut insérer (INSERT)
- Tout le monde peut modifier (UPDATE)
- Tout le monde peut supprimer (DELETE)

**Note :** En production, vous devriez restreindre UPDATE/DELETE aux utilisateurs authentifiés.

## 🔍 VÉRIFICATIONS POST-MIGRATION

Exécutez ceci pour vérifier :
```sql
-- Vérifier qu'une nouvelle commande génère bien un order_number
INSERT INTO orders (restaurant_id, items, total)
VALUES (
  '0ae9a027-7bf3-4732-a165-a954056c32ec',
  '[{"name": "Test", "quantity": 1}]'::jsonb,
  100
)
RETURNING id, order_number, created_at;

-- Devrait retourner quelque chose comme : ORD-20260212-0001
```

## ❓ EN CAS DE PROBLÈME

Si le script échoue :
1. Copiez l'erreur complète
2. Envoyez-la moi
3. Je vous donnerai la solution

## 📊 STRUCTURE FINALE

Après le script, votre table aura :
- 16 colonnes (toutes optimisées)
- 6 index (pour rapidité)
- 4 politiques RLS (pour sécurité)
- 1 trigger (pour auto-generation)
- 1 séquence (pour order_number)

## 🚀 PROCHAINES ÉTAPES (OPTIONNEL)

Une fois que tout fonctionne, vous pouvez :
1. Activer l'ENUM pour `status` (décommenter section 7)
2. Ajouter les colonnes supplémentaires (section 6)
3. Restreindre les RLS policies (en production)
