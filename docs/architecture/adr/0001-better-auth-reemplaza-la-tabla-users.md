# ADR 0001: Better Auth reemplaza la tabla `users` del ERS

## Status

Accepted

## Context

`ERS.md` §7 define una tabla `users` propia con `password_hash`, y §32 expone
`POST /api/admin/auth/login|logout|refresh|me`. SEC-003 pide Argon2id o bcrypt con
rate limiting.

El contexto técnico del proyecto dice lo contrario:

- `docs/architecture/stack.md:49-52`: Better Auth es dueño de sign-in, sign-out,
  sesiones, cookies, hashing y tablas de auth.
- `AGENTS.md:57`: no implementar hashing de contraseñas, flujos de login ni
  almacenamiento de sesiones a mano.
- `docs/security/principles.md:10-11`: usar Better Auth en lugar de primitivas
  propias, y guardar las sesiones en su capa de persistencia.

Las dos fuentes no pueden cumplirse a la vez. Mantener ambas implicaría o bien un
sistema de auth casero que el resto de la documentación prohíbe, o bien duplicar el
concepto de usuario en dos tablas.

## Decision

Better Auth es dueño de la autenticación. La tabla `users` del ERS §7 no se crea.

- Los modelos `User`, `Session`, `Account` y `Verification` de Better Auth viven en
  el mismo PostgreSQL, vía su adaptador de Prisma.
- Las columnas `role`, `is_active` y `last_login_at` del ERS §7 se conservan como
  campos adicionales del modelo `User`.
- Las claves foráneas `works.created_by`, `works.updated_by`,
  `media_assets.uploaded_by`, `page_content.updated_by`, `site_settings.updated_by`
  y `audit_log.user_id` apuntan a `user.id`.
- Solo se habilita email + contraseña. Sin OTP, sin 2FA, sin magic link, sin OAuth,
  sin registro público.
- El hash lo produce Better Auth. Ningún código de la aplicación lo escribe ni lo
  lee.

## Consequences

- Positiva: se cumplen `AGENTS.md`, `stack.md` y `security/principles.md` sin
  excepciones, y desaparece la superficie de error de un login casero.
- Positiva: la rotación de sesiones, las cookies `HttpOnly` y el hashing quedan a
  cargo de una librería mantenida, no de este repositorio.
- Negativa: el esquema real se aparta de `ERS.md` §7. El ERS queda desactualizado en
  ese punto concreto y este ADR es la fuente de verdad.
- Negativa: la forma de las tablas de auth la dicta Better Auth, no el ERS.
- Seguimiento: ver [ADR-0003](0003-sin-endpoint-de-refresh.md) para el endpoint
  `/refresh` del ERS §32, que desaparece como consecuencia de esta decisión.
