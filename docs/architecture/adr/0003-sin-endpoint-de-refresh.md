# ADR 0003: Sin endpoint de refresh

## Status

Accepted

## Context

`ERS.md` §32 lista `POST /api/admin/auth/refresh` entre los endpoints mínimos de
autenticación, junto a `login`, `logout` y `me`.

Ese endpoint pertenece al modelo de access token corto más refresh token, que SEC-002
menciona como una de las dos opciones aceptables. La otra es sesión con cookie
`HttpOnly`, que es la que impone [ADR-0001](0001-better-auth-reemplaza-la-tabla-users.md)
al adoptar Better Auth.

Con sesión por cookie no hay ningún token en poder del cliente que refrescar: la
sesión vive en la base de datos y la cookie solo transporta su identificador.

## Decision

No se implementa `POST /api/admin/auth/refresh`.

La renovación de la sesión la gestiona Better Auth de forma transparente, extendiendo
la expiración cuando la sesión se usa. Los otros tres endpoints del ERS §32 se
mantienen con la forma que expone Better Auth bajo `/api/admin/auth/*`.

## Consequences

- Positiva: no se mantiene un endpoint que no haría nada.
- Positiva: se cumple SEC-002, que prefiere no guardar refresh tokens en el cliente.
  No hay refresh token que pueda acabar en `localStorage`.
- Negativa: el ERS §32 queda desactualizado en este punto; este ADR es la fuente de
  verdad.
- Seguimiento: el frontend no debe implementar lógica de refresh; basta con reenviar
  la cookie y tratar un 401 como sesión terminada.
