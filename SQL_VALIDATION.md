# Consultas SQL para Validación

Este documento contiene consultas SQL útiles para validar el funcionamiento de la plataforma fintech.

## Conexión a la Base de Datos

```bash
docker exec -it belo-postgres psql -U belo_user -d belo_db
```

O sin TTY:
```bash
docker exec belo-postgres psql -U belo_user -d belo_db
```

## Validación de Usuarios

### Ver todos los usuarios con sus balances
```sql
SELECT id, name, email, balance, version, "createdAt", "updatedAt" 
FROM users 
ORDER BY id;
```

### Verificar que no haya saldos negativos
```sql
SELECT id, name, balance 
FROM users 
WHERE balance < 0;
```
**Resultado esperado:** 0 filas (no debe haber saldos negativos)

### Contar usuarios
```sql
SELECT COUNT(*) as total_usuarios FROM users;
```

### Ver balance total del sistema
```sql
SELECT SUM(balance) as balance_total_sistema FROM users;
```

## Validación de Transacciones

### Ver todas las transacciones
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    status, 
    "createdAt", 
    "updatedAt"
FROM transactions 
ORDER BY "createdAt" DESC;
```

### Contar transacciones por estado
```sql
SELECT 
    status, 
    COUNT(*) as cantidad,
    SUM(amount) as monto_total
FROM transactions 
GROUP BY status;
```

### Ver transacciones de un usuario específico (como origen o destino)
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    status,
    CASE 
        WHEN "originId" = 'user-1' THEN 'Origen'
        WHEN "destinationId" = 'user-1' THEN 'Destino'
    END as rol
FROM transactions 
WHERE "originId" = 'user-1' OR "destinationId" = 'user-1'
ORDER BY "createdAt" DESC;
```

### Ver transacciones pendientes (requieren aprobación)
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    "createdAt"
FROM transactions 
WHERE status = 'pending'
ORDER BY "createdAt" DESC;
```

### Ver transacciones confirmadas
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    "createdAt"
FROM transactions 
WHERE status = 'confirmed'
ORDER BY "createdAt" DESC;
```

### Ver transacciones rechazadas
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    "createdAt",
    "updatedAt"
FROM transactions 
WHERE status = 'rejected'
ORDER BY "createdAt" DESC;
```

### Verificar transacciones con monto > 50.000 (deben estar pending)
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    status
FROM transactions 
WHERE amount > 50000 AND status != 'pending';
```
**Resultado esperado:** 0 filas (todas las transacciones > 50k deben estar pending)

### Verificar transacciones con monto <= 50.000 (deben estar confirmed)
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    status
FROM transactions 
WHERE amount <= 50000 AND status != 'confirmed';
```
**Resultado esperado:** 0 filas (todas las transacciones <= 50k deben estar confirmed automáticamente)

## Validación de Integridad de Datos

### Verificar que los balances coincidan con las transacciones
```sql
WITH transacciones_origen AS (
    SELECT 
        "originId" as user_id,
        SUM(amount) as total_debitado
    FROM transactions 
    WHERE status = 'confirmed'
    GROUP BY "originId"
),
transacciones_destino AS (
    SELECT 
        "destinationId" as user_id,
        SUM(amount) as total_acreditado
    FROM transactions 
    WHERE status = 'confirmed'
    GROUP BY "destinationId"
),
balance_calculado AS (
    SELECT 
        u.id,
        u.balance as balance_actual,
        COALESCE(orig.total_debitado, 0) as total_debitado,
        COALESCE(dest.total_acreditado, 0) as total_acreditado,
        (COALESCE(dest.total_acreditado, 0) - COALESCE(orig.total_debitado, 0)) as balance_calculado
    FROM users u
    LEFT JOIN transacciones_origen orig ON u.id = orig.user_id
    LEFT JOIN transacciones_destino dest ON u.id = dest.user_id
)
SELECT 
    id,
    balance_actual,
    total_debitado,
    total_acreditado,
    balance_calculado,
    (balance_actual - balance_calculado) as diferencia
FROM balance_calculado
WHERE ABS(balance_actual - balance_calculado) > 0.01;
```
**Resultado esperado:** 0 filas (los balances deben coincidir)

### Verificar que no haya transacciones con mismo origen y destino
```sql
SELECT id, "originId", "destinationId", amount
FROM transactions
WHERE "originId" = "destinationId";
```
**Resultado esperado:** 0 filas (no debe haber transacciones a sí mismo)

## Validación de Outbox Pattern

### Ver eventos pendientes en outbox
```sql
SELECT 
    id, 
    "aggregateId", 
    type, 
    status, 
    "createdAt"
FROM outbox 
WHERE status = 'pending'
ORDER BY "createdAt" ASC;
```

### Ver eventos procesados
```sql
SELECT 
    id, 
    "aggregateId", 
    type, 
    status, 
    "createdAt",
    "processedAt"
FROM outbox 
WHERE status = 'processed'
ORDER BY "processedAt" DESC
LIMIT 20;
```

### Ver eventos fallidos
```sql
SELECT 
    id, 
    "aggregateId", 
    type, 
    status, 
    error,
    "createdAt",
    "processedAt"
FROM outbox 
WHERE status = 'failed'
ORDER BY "processedAt" DESC;
```

### Contar eventos por tipo
```sql
SELECT 
    type, 
    status, 
    COUNT(*) as cantidad
FROM outbox 
GROUP BY type, status
ORDER BY type, status;
```

### Ver eventos relacionados con una transacción específica
```sql
SELECT 
    id, 
    "aggregateId", 
    type, 
    status, 
    "createdAt",
    "processedAt"
FROM outbox 
WHERE "aggregateId" = 'tx-id-aqui'
ORDER BY "createdAt" DESC;
```

## Validación de Concurrencia y Transacciones

### Ver versión de usuarios (para optimistic locking)
```sql
SELECT id, name, balance, version 
FROM users 
ORDER BY id;
```

### Verificar que no haya transacciones duplicadas
```sql
SELECT 
    "originId", 
    "destinationId", 
    amount, 
    status,
    COUNT(*) as cantidad
FROM transactions 
GROUP BY "originId", "destinationId", amount, status
HAVING COUNT(*) > 1;
```
**Resultado esperado:** 0 filas (no debe haber duplicados exactos)

## Validación de Migraciones

### Ver historial de migraciones ejecutadas
```sql
SELECT id, timestamp, name 
FROM migrations 
ORDER BY timestamp DESC;
```

### Verificar que todas las tablas existan
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
**Resultado esperado:** Debe incluir: `migrations`, `outbox`, `transactions`, `users`

## Validación de Índices

### Ver índices en tabla transactions
```sql
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions';
```

### Ver índices en tabla outbox
```sql
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'outbox';
```

### Ver índices en tabla users
```sql
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users';
```

## Consultas de Resumen y Estadísticas

### Resumen general del sistema
```sql
SELECT 
    (SELECT COUNT(*) FROM users) as total_usuarios,
    (SELECT COUNT(*) FROM transactions) as total_transacciones,
    (SELECT COUNT(*) FROM transactions WHERE status = 'pending') as transacciones_pendientes,
    (SELECT COUNT(*) FROM transactions WHERE status = 'confirmed') as transacciones_confirmadas,
    (SELECT COUNT(*) FROM transactions WHERE status = 'rejected') as transacciones_rechazadas,
    (SELECT SUM(balance) FROM users) as balance_total_sistema,
    (SELECT COUNT(*) FROM outbox WHERE status = 'pending') as eventos_pendientes;
```

### Top 5 usuarios por balance
```sql
SELECT id, name, balance 
FROM users 
ORDER BY balance DESC 
LIMIT 5;
```

### Transacciones más grandes
```sql
SELECT 
    id, 
    "originId", 
    "destinationId", 
    amount, 
    status
FROM transactions 
ORDER BY amount DESC 
LIMIT 10;
```

### Actividad por día
```sql
SELECT 
    DATE("createdAt") as fecha,
    COUNT(*) as cantidad_transacciones,
    SUM(amount) as monto_total
FROM transactions 
GROUP BY DATE("createdAt")
ORDER BY fecha DESC;
```

## Consultas de Limpieza (Solo para Testing)

### Eliminar todas las transacciones
```sql
DELETE FROM transactions;
```

### Eliminar todos los usuarios (excepto los del seed)
```sql
DELETE FROM users WHERE id NOT IN ('user-1', 'user-2', 'user-3');
```

### Eliminar eventos del outbox
```sql
DELETE FROM outbox;
```

### Resetear balances a valores iniciales
```sql
UPDATE users 
SET balance = CASE 
    WHEN id = 'user-1' THEN 100000
    WHEN id = 'user-2' THEN 50000
    WHEN id = 'user-3' THEN 75000
    ELSE balance
END,
version = 0;
```

## Validación de Constraints

### Verificar constraint de email único
```sql
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;
```
**Resultado esperado:** 0 filas (emails deben ser únicos)

### Verificar constraint de enum en transactions
```sql
SELECT DISTINCT status 
FROM transactions 
WHERE status NOT IN ('pending', 'confirmed', 'rejected');
```
**Resultado esperado:** 0 filas (solo debe haber esos 3 estados)

### Verificar constraint de enum en outbox
```sql
SELECT DISTINCT status 
FROM outbox 
WHERE status NOT IN ('pending', 'processed', 'failed');
```
**Resultado esperado:** 0 filas (solo debe haber esos 3 estados)

## Notas

- Todas las consultas asumen que estás conectado a la base de datos `belo_db` con el usuario `belo_user`
- Reemplaza `'user-1'`, `'tx-id-aqui'`, etc. con valores reales según necesites
- Las consultas de validación deben retornar 0 filas si todo está correcto
- Usa `\q` para salir de psql

