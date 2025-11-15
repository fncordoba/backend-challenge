# Belo Fintech Challenge

Mini plataforma fintech para gestión de cuentas virtuales en pesos y transacciones entre usuarios.

## Requisitos

- Node.js 18+
- Docker y Docker Compose
- yarn

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
yarn install
```

3. Levantar servicios (PostgreSQL y Redis):
```bash
docker-compose up -d
```

4. Ejecutar migraciones:
```bash
yarn migrate
```

5. Poblar base de datos con datos de prueba:
```bash
yarn seed
```

## Ejecución

### Desarrollo
```bash
yarn start:dev
```

La aplicación estará disponible en `http://localhost:3000`
La documentación Swagger en `http://localhost:3000/api-docs`

### Producción
```bash
yarn build
yarn start:prod
```

## Endpoints

### POST /users
Crea un nuevo usuario en el sistema (útil para no depender solo del seed).

**Body:**
```json
{
  "name": "Ana Gomez",
  "email": "ana@example.com",
  "balance": 50000
}
```

### POST /transactions
Crea una nueva transacción entre dos usuarios.

**Body:**
```json
{
  "originId": "user-1",
  "destinationId": "user-2",
  "amount": 10000
}
```

**Reglas:**
- Si `amount <= 50000`: se confirma automáticamente y se mueven los fondos
- Si `amount > 50000`: queda en estado `pending` y requiere aprobación manual

### GET /transactions?userId={userId}
Lista todas las transacciones de un usuario (como origen o destino), ordenadas por fecha descendente.

### PATCH /transactions/:id/approve
Aprueba una transacción pendiente y realiza el movimiento de fondos.

### PATCH /transactions/:id/reject
Rechaza una transacción pendiente sin modificar saldos.

## Testing

### Tests unitarios de casos de uso
```bash
yarn test
```

> Los flujos end-to-end (creación, aprobación, errores) se validan con cURL y SQL. Ver `CURL_COMMANDS.md` y `SQL_VALIDATION.md`.

## Outbox Worker

Para procesar eventos del outbox pattern:
```bash
yarn outbox:worker
```

## Scripts disponibles

- `yarn start`: inicia la aplicación (NestJS con ts-node)
- `yarn start:dev`: inicia en modo desarrollo con hot-reload
- `yarn build`: compila el proyecto
- `yarn start:prod`: inicia en modo producción
- `yarn migrate`: ejecuta migraciones
- `yarn seed`: crea datos de prueba
- `yarn test`: ejecuta tests unitarios de casos de uso
- `yarn outbox:worker`: inicia worker de outbox
- `yarn ci`: lint + tests + build

## Estructura del proyecto

Ver `architecture.md` para documentación completa de arquitectura, decisiones técnicas y diagramas.

## Validación SQL

Ver `SQL_VALIDATION.md` para consultas SQL útiles para validar el funcionamiento del sistema, verificar integridad de datos, y hacer debugging.

## Datos de prueba

El seed crea 3 usuarios:
- `user-1`: Juan Pérez, balance: $100.000
- `user-2`: María García, balance: $50.000
- `user-3`: Carlos López, balance: $75.000

## Documentación API

- Swagger UI: http://localhost:3000/api-docs
- Postman Collection: `postman_collection.json`
- cURL commands: `curls.json`

## Variables de entorno

Puedes configurar estas variables (valores por defecto):

- `DB_HOST`: localhost
- `DB_PORT`: 5432
- `DB_USER`: belo_user
- `DB_PASSWORD`: belo_pass
- `DB_NAME`: belo_db
- `REDIS_URL`: redis://localhost:6379
- `PORT`: 3000

## Notas

- La aplicación funciona sin Redis (cache es opcional)
- Todas las operaciones de saldo son atómicas y transaccionales
- Se usa pessimistic locking para prevenir race conditions
- Ver `architecture.md` para detalles técnicos completos

