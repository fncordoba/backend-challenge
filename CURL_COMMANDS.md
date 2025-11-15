# Comandos cURL para Validación

Comandos listos para copiar y pegar en la terminal para probar todos los endpoints.

## Verificar que el servicio esté corriendo

```bash
curl http://localhost:3000/api-docs
```

## 1. Crear Transacción <= 50k (Se confirma automáticamente)

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": 10000
  }'
```

**Resultado esperado:** Status 201, transacción con `status: "confirmed"`

## 2. Crear Transacción > 50k (Queda pendiente)

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": 60000
  }'
```

**Resultado esperado:** Status 201, transacción con `status: "pending"`

## 3. Listar Transacciones de un Usuario

```bash
curl "http://localhost:3000/transactions?userId=user-1"
```

**Resultado esperado:** Status 200, array de transacciones ordenadas por fecha

## 4. Aprobar Transacción Pendiente

Primero necesitas el ID de una transacción pendiente. Luego:

```bash
curl -X PATCH http://localhost:3000/transactions/{TRANSACTION_ID}/approve
```

**Ejemplo con ID real:**
```bash
curl -X PATCH http://localhost:3000/transactions/abc123-def456-ghi789/approve
```

**Resultado esperado:** Status 200, transacción con `status: "confirmed"` y balances actualizados

## 5. Rechazar Transacción Pendiente

```bash
curl -X PATCH http://localhost:3000/transactions/{TRANSACTION_ID}/reject
```

**Ejemplo con ID real:**
```bash
curl -X PATCH http://localhost:3000/transactions/abc123-def456-ghi789/reject
```

**Resultado esperado:** Status 200, transacción con `status: "rejected"`

## Flujo Completo de Prueba

### Paso 1: Crear transacción pequeña (se confirma automáticamente)
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": 5000
  }' | jq
```

### Paso 2: Verificar que los balances cambiaron
```bash
docker exec belo-postgres psql -U belo_user -d belo_db -c "SELECT id, name, balance FROM users ORDER BY id;"
```

**Resultado esperado:**
- user-1: balance = 95000 (100000 - 5000)
- user-2: balance = 55000 (50000 + 5000)

### Paso 3: Crear transacción grande (queda pendiente)
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-2",
    "destinationId": "user-3",
    "amount": 60000
  }' | jq
```

### Paso 4: Guardar el ID de la transacción pendiente
```bash
TX_ID=$(curl -s -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-3",
    "destinationId": "user-1",
    "amount": 70000
  }' | jq -r '.id')

echo "Transaction ID: $TX_ID"
```

### Paso 5: Aprobar la transacción pendiente
```bash
curl -X PATCH http://localhost:3000/transactions/$TX_ID/approve | jq
```

### Paso 6: Verificar balances después de aprobar
```bash
docker exec belo-postgres psql -U belo_user -d belo_db -c "SELECT id, name, balance FROM users ORDER BY id;"
```

### Paso 7: Listar todas las transacciones de user-1
```bash
curl "http://localhost:3000/transactions?userId=user-1" | jq
```

## Casos de Error

### Error: Usuario no encontrado
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-999",
    "destinationId": "user-2",
    "amount": 1000
  }'
```

**Resultado esperado:** Status 404 o 400 con mensaje de error

### Error: Saldo insuficiente
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-2",
    "destinationId": "user-1",
    "amount": 100000
  }'
```

**Resultado esperado:** Status 400 con mensaje "Insufficient funds"

### Error: Monto negativo
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": -1000
  }'
```

**Resultado esperado:** Status 400 con mensaje de validación

### Error: Origen y destino iguales
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-1",
    "amount": 1000
  }'
```

**Resultado esperado:** Status 400 con mensaje de error

## Ver Respuestas Formateadas (con jq)

Si tienes `jq` instalado, puedes formatear las respuestas JSON:

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": 10000
  }' | jq
```

## Ver Solo Headers de Respuesta

```bash
curl -I http://localhost:3000/transactions?userId=user-1
```

## Ver Respuesta Completa (headers + body)

```bash
curl -v -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "originId": "user-1",
    "destinationId": "user-2",
    "amount": 10000
  }'
```

## Validar Outbox después de crear transacciones

```bash
docker exec belo-postgres psql -U belo_user -d belo_db -c "SELECT id, type, status, \"aggregateId\" FROM outbox ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## Notas

- Reemplaza `{TRANSACTION_ID}` con el ID real de una transacción
- Los IDs de transacciones se generan automáticamente (UUIDs)
- Usa `jq` para formatear JSON si lo tienes instalado: `sudo apt install jq` o `brew install jq`
- Todos los endpoints retornan JSON
- La documentación Swagger está en: http://localhost:3000/api-docs

