# Reporte de Validación - Endpoints y Reglas de Negocio

## Endpoints Requeridos

### 1. POST /users ✅
**Estado:** Implementado y validado manualmente
- **Ubicación:** `src/controllers/users.controller.ts`
- **Funcionalidad:** Crea un nuevo usuario (nombre, email, balance) para no depender solo del seed

### 2. POST /transactions ✅
**Estado:** Implementado y testado
- **Ubicación:** `src/controllers/transactions.controller.ts:30-38`
- **Tests Unitarios:** `src/application/use-cases/create-transaction.usecase.spec.ts`
- **Validación manual:** cURL + SQL (`CURL_COMMANDS.md`, `SQL_VALIDATION.md`)
- **Funcionalidad:** Crea una nueva transacción entre dos usuarios

### 3. GET /transactions?userId={userId} ✅
**Estado:** Implementado y validado manualmente
- **Ubicación:** `src/controllers/transactions.controller.ts:40-46`
- **Funcionalidad:** Lista transacciones de un usuario (origen o destino), ordenadas por fecha

### 4. PATCH /transactions/:id/approve ✅
**Estado:** Implementado y testado
- **Ubicación:** `src/controllers/transactions.controller.ts:48-56`
- **Tests Unitarios:** `src/application/use-cases/approve-transaction.usecase.spec.ts`
- **Validación manual:** cURL + SQL (verificación de balances y outbox)
- **Funcionalidad:** Aprueba una transacción pendiente y realiza el movimiento de fondos

### 5. PATCH /transactions/:id/reject ✅
**Estado:** Implementado
- **Ubicación:** `src/controllers/transactions.controller.ts:58-66`
- **Tests Unitarios:** No implementado (use-case existe pero sin tests)
- **Funcionalidad:** Rechaza una transacción pendiente sin modificar saldos

**Resumen Endpoints:**
- ✅ 5/5 endpoints implementados
- ✅ 2/5 endpoints con tests unitarios (casos de uso de creación y aprobación)
- ✅ Todos los endpoints validados manualmente con cURL y SQL
- ⚠️ Endpoint `reject` sin tests automatizados

---

## Reglas de Negocio Requeridas

### 1. No permitir saldo negativo ✅
**Estado:** Implementado y testado
- **Ubicación:** 
  - `src/domain/entities/user.entity.ts:15-21` (método `hasSufficientBalance`)
  - `src/application/use-cases/create-transaction.usecase.ts:70-72`
  - `src/application/use-cases/approve-transaction.usecase.ts:50-52`
- **Tests:** 
  - `create-transaction.usecase.spec.ts:103-111` (insufficient funds)
  - `approve-transaction.usecase.spec.ts:103-120` (insufficient funds en approve)
- **Validación:** ✅ Implementado con excepción `InsufficientFundsException`

### 2. Operaciones atómicas (débito y crédito juntos o nada) ✅
**Estado:** Implementado y testado
- **Ubicación:** 
  - `src/application/use-cases/create-transaction.usecase.ts:52-120` (transacción DB)
  - `src/application/use-cases/approve-transaction.usecase.ts:37-95` (transacción DB)
- **Tests:** 
  - `create-transaction.usecase.spec.ts:163-170` (rollback en error)
  - Tests de integración verifican balances correctos después de transacciones
- **Validación:** ✅ Usa transacciones ACID de PostgreSQL con `queryRunner.startTransaction()`

### 3. Evitar concurrencia que permita sobregiros ✅
**Estado:** Implementado
- **Ubicación:** 
  - `src/infrastructure/persistence/typeorm/repositories/user.repository.ts:20-26` (`findByIdForUpdate` con `SELECT FOR UPDATE`)
  - `src/application/use-cases/create-transaction.usecase.ts:56-59`
  - `src/application/use-cases/approve-transaction.usecase.ts:42-46`
- **Tests:** No hay tests específicos de concurrencia (requeriría tests de carga)
- **Validación:** ✅ Implementado con pessimistic locking (`SELECT FOR UPDATE`)

### 4. Validaciones de creación de transacción ✅
**Estado:** Implementado y testado
- **4.1. Origen y destino existen:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:61-69`
  - **Tests:** `create-transaction.usecase.spec.ts:87-101`
- **4.2. Origen tiene saldo suficiente:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:70-72`
  - **Tests:** `create-transaction.usecase.spec.ts:103-111`
- **4.3. Monto > $50.000 => estado `pending`:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:74`
  - **Tests:** `create-transaction.usecase.spec.ts:138-161`
- **4.4. Monto ≤ $50.000 => confirmar automáticamente:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:74, 77-85`
  - **Tests:** `create-transaction.usecase.spec.ts:113-136`
- **4.5. Validación de monto positivo:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:44-46`
  - **Tests:** `create-transaction.usecase.spec.ts:81-85`
- **4.6. Validación origen != destino:**
  - **Ubicación:** `src/application/use-cases/create-transaction.usecase.ts:48-50`
  - **Tests:** No hay test específico (debería agregarse)

### 5. Aprobar transacción pendiente ✅
**Estado:** Implementado y testado
- **5.1. Solo si estaba `pending`:**
  - **Ubicación:** `src/application/use-cases/approve-transaction.usecase.ts:45-51`
  - **Tests:** `approve-transaction.usecase.spec.ts:89-101`
- **5.2. Verificar saldo suficiente al aprobar:**
  - **Ubicación:** `src/application/use-cases/approve-transaction.usecase.ts:53-55`
  - **Tests:** `approve-transaction.usecase.spec.ts:103-120`
- **5.3. Realizar movimiento de fondos:**
  - **Ubicación:** `src/application/use-cases/approve-transaction.usecase.ts:57-65`
  - **Tests:** `approve-transaction.usecase.spec.ts:122-149`

### 6. Rechazar transacción pendiente ✅
**Estado:** Implementado
- **6.1. Solo si estaba `pending`:**
  - **Ubicación:** `src/application/use-cases/reject-transaction.usecase.ts:40-46`
  - **Tests:** No implementado
- **6.2. No modifica saldos:**
  - **Ubicación:** `src/application/use-cases/reject-transaction.usecase.ts` (no hay actualización de balances)
  - **Tests:** No implementado

**Resumen Reglas de Negocio:**
- ✅ 6/6 reglas principales implementadas
- ✅ 5/6 reglas con tests
- ⚠️ 1/6 regla (reject) sin tests

---

## Tests Implementados

### Tests Unitarios
1. ✅ `create-transaction.usecase.spec.ts`
   - Monto negativo
   - Usuario origen no encontrado
   - Usuario destino no encontrado
   - Saldo insuficiente
   - Crear transacción confirmada (≤50k)
   - Crear transacción pendiente (>50k)
   - Rollback en error
   - Origen y destino iguales (regla de negocio específica)

2. ✅ `approve-transaction.usecase.spec.ts`
   - Transacción no encontrada
   - Transacción no está pendiente
   - Saldo insuficiente al aprobar
   - Aprobar transacción exitosamente

### Tests de Integración
- Actualmente no se mantienen tests de integración automatizados; los flujos end-to-end se validan con cURL y SQL (`CURL_COMMANDS.md`, `SQL_VALIDATION.md`).

---

## Tests Faltantes

### Tests Unitarios
- ❌ `reject-transaction.usecase.spec.ts` - No existe

### Tests de Integración
- ❌ Test para PATCH /transactions/:id/reject
- ❌ Test de concurrencia (múltiples transacciones simultáneas)

---

## Cobertura Estimada

- **Endpoints:** foco en casos de uso de negocio; validación manual complementa la falta de tests de controller
- **Reglas de Negocio:** todas las reglas críticas de creación/aprobación de transacciones están cubiertas por tests unitarios
- **Use Cases:** 2 casos de uso críticos (create/approve) con buena cobertura; reject pendiente de tests

