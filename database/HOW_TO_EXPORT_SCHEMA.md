# Comment obtenir le schéma complet de votre base de données Supabase

## Méthode 1 : Via l'interface Supabase (recommandée)

1. **Table Editor** → Cliquez sur la table `orders`
2. En haut à droite → **Trois points (⋮)** → **View SQL definition**
3. Copiez tout le SQL et envoyez-le moi

## Méthode 2 : Via SQL Editor

Exécutez cette requête dans le SQL Editor de Supabase :

```sql
-- Pour voir la structure complète de la table orders
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;
```

## Méthode 3 : Voir les contraintes

```sql
-- Pour voir les contraintes (CHECK, FOREIGN KEY, etc.)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'orders'
ORDER BY tc.constraint_type, tc.constraint_name;
```

## Méthode 4 : Voir les politiques RLS

```sql
-- Pour voir toutes les politiques RLS sur la table orders
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders';
```

## Ce dont j'ai besoin pour vous aider :

Pour chaque colonne de votre table `orders`, donnez-moi :
- **Nom de la colonne**
- **Type** (text, uuid, boolean, numeric, jsonb, etc.)
- **Nullable ?** (YES/NO)
- **Valeur par défaut**
- **Contraintes** (CHECK, UNIQUE, etc.)

### Exemple de format :

```
Column: id
Type: uuid
Nullable: NO
Default: uuid_generate_v4()
Constraints: PRIMARY KEY

Column: status
Type: text
Nullable: NO
Default: 'pending'::text
Constraints: CHECK (status IN ('pending', 'completed', ...))
```

## Actions immédiates à faire :

1. **Allez dans Supabase → SQL Editor**
2. **Copiez-collez le contenu du fichier `database/fixes.sql`**
3. **Exécutez-le** (cliquez sur "Run")
4. **Testez** en cliquant sur "Finished" dans votre app

Cela devrait résoudre le problème du statut qui ne se met pas à jour !
