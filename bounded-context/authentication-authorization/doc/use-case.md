### **1. RegisterUser**

- **Nombre en inglés**: `RegisterUser`
- **Propósito**: Registrar un nuevo usuario en el sistema.
- **Por qué es necesario**:
    - Permite a los usuarios crear cuentas para interactuar con el sistema.
    - Garantiza que los datos ingresados cumplan con los estándares del sistema.
    - Es el punto de partida del ciclo de vida del usuario.
- **DTO**: `RegisterUserDTO`
    - **Parámetros**:
        - `name`: `string` – Nombre del usuario.
        - `email`: `string` – Correo electrónico del usuario, debe ser único.
        - `password`: `string` – Contraseña del usuario, validada para seguridad.
- **Retorno**: `UserDTO` – Contiene los datos básicos del usuario registrado.

---

### **2. UpdateUser**

- **Nombre en inglés**: `UpdateUser`
- **Propósito**: Actualizar la información personal de un usuario existente.
- **Por qué es necesario**:
    - Permite a los usuarios mantener sus datos actualizados.
    - Facilita el cumplimiento de normativas de privacidad como GDPR.
    - Proporciona flexibilidad para ajustar la experiencia del usuario.
- **DTO**: `UpdateUserDTO`
    - **Parámetros**:
        - `userId`: `string` – Identificador único del usuario.
        - `name?`: `string` – Nuevo nombre del usuario.
        - `password?`: `string` – Nueva contraseña, validada.
- **Retorno**: `UserDTO` – Datos del usuario actualizado.

---

### **3. DeleteUser**

- **Nombre en inglés**: `DeleteUser`
- **Propósito**: Eliminar un usuario del sistema.
- **Por qué es necesario**:
    - Garantiza la limpieza de datos obsoletos o no deseados.
    - Permite a los usuarios ejercer su derecho al olvido.
    - Evita problemas relacionados con usuarios inactivos o duplicados.
- **DTO**: `DeleteUserDTO`
    - **Parámetros**:
        - `userId`: `string` – Identificador único del usuario.
- **Retorno**: `boolean` – Indica éxito o fallo.

---

### **4. Login**

- **Nombre en inglés**: `Login`
- **Propósito**: Permitir a un usuario iniciar sesión.
- **Por qué es necesario**:
    - Proporciona acceso seguro al sistema.
    - Establece el punto de entrada para el uso de recursos protegidos.
    - Integra mecanismos de autenticación robustos.
- **DTO**: `LoginDTO`
    - **Parámetros**:
        - `email`: `string` – Correo electrónico del usuario.
        - `password`: `string` – Contraseña del usuario.
- **Retorno**: `AuthTokenDTO` – Token JWT para acceso seguro.

---

### **5. ExternalLogin**

- **Nombre en inglés**: `ExternalLogin`
- **Propósito**: Autenticar usuarios a través de proveedores externos.
- **Por qué es necesario**:
    - Reduce la fricción al registrar usuarios.
    - Facilita la autenticación rápida mediante servicios confiables.
    - Soporta integraciones con sistemas externos.
- **DTO**: `ExternalLoginDTO`
    - **Parámetros**:
        - `provider`: `string` – Nombre del proveedor (e.g., `google`, `facebook`).
        - `providerToken`: `string` – Token generado por el proveedor.
- **Retorno**: `AuthTokenDTO` – Token JWT para acceso seguro.

---

### **6. AccessAsGuest**

- **Nombre en inglés**: `AccessAsGuest`
- **Propósito**: Permitir a los usuarios acceder como invitados con permisos limitados.
- **Por qué es necesario**:
    - Proporciona acceso temporal para explorar el sistema.
    - Reduce barreras para nuevos usuarios.
    - Es ideal para escenarios donde no se requiere registro completo.
- **DTO**: `AccessAsGuestDTO`
    - **Parámetros**: Ninguno.
- **Retorno**: `AuthTokenDTO` – Token temporal limitado.

---

### **7. AssignRole**

- **Nombre en inglés**: `AssignRole`
- **Propósito**: Asignar roles a los usuarios para gestionar permisos.
- **Por qué es necesario**:
    - Controla qué usuarios pueden acceder a ciertos recursos.
    - Facilita la administración jerárquica de roles.
    - Mejora la seguridad y el control de accesos.
- **DTO**: `AssignRoleDTO`
    - **Parámetros**:
        - `userId`: `string` – Identificador único del usuario.
        - `role`: `string` – Rol asignado (e.g., `admin`, `user`).
- **Retorno**: `boolean` – Indica éxito o fallo.

---

### **8. MergeProfiles**

- **Nombre en inglés**: `MergeProfiles`
- **Propósito**: Consolidar perfiles duplicados de usuarios.
- **Por qué es necesario**:
    - Evita duplicados que pueden causar inconsistencias.
    - Mejora la experiencia del usuario al mantener un único perfil.
    - Ahorra recursos al consolidar datos.
- **DTO**: `MergeProfilesDTO`
    - **Parámetros**:
        - `primaryUserId`: `string` – Usuario principal.
        - `duplicateUserIds`: `string[]` – IDs de usuarios duplicados.
- **Retorno**: `UserDTO` – Perfil consolidado.

---

### **9. EnsureCompliance**

- **Nombre en inglés**: `EnsureCompliance`
- **Propósito**: Verificar y garantizar el cumplimiento normativo.
- **Por qué es necesario**:
    - Asegura que el sistema cumple con leyes como GDPR.
    - Automatiza revisiones y alertas de privacidad.
    - Ofrece confianza a los usuarios sobre la gestión de sus datos.
- **DTO**: `EnsureComplianceDTO`
    - **Parámetros**:
        - `userId`: `string` – Identificador del usuario.
        - `complianceType`: `string` – Tipo de revisión (e.g., `privacy`, `security`).
- **Retorno**: `ComplianceResultDTO` – Estado de cumplimiento.

---

### **10. Logout**

- **Nombre en inglés**: `Logout`
- **Propósito**:
    - Finalizar la sesión de un usuario de manera segura.
    - Inhabilitar el token de autenticación usado por el usuario.
    - Limpiar recursos relacionados con la sesión activa (como cachés o datos temporales).
- **Por qué es necesario**:
    - Asegura que los usuarios puedan cerrar su sesión para proteger su cuenta.
    - Previene accesos no autorizados después de que un usuario haya terminado de usar el sistema.
    - Cumple con las expectativas de privacidad y seguridad de los usuarios.
    - Es crucial en sistemas que manejan dispositivos compartidos o sesiones múltiples.
- **DTO**: `LogoutDTO`
    - **Parámetros**:
        - `userId`: `string` – Identificador único del usuario (opcional si el sistema usa tokens).
        - `token`: `string` – Token JWT del usuario autenticado que se desea invalidar.
- **Retorno**:
    - `boolean` – Indica éxito o fallo del cierre de sesión.

---

### **11. RefreshAccessToken**

- **Nombre en inglés**: `RefreshAccessToken`
- **Propósito**:
    - Permitir que los usuarios obtengan un nuevo token de acceso válido utilizando un **Refresh Token**.
    - Minimizar los riesgos de seguridad al expirar tokens de acceso con mayor frecuencia.
- **Por qué es necesario**:
    - Mejora la seguridad: Incluso si un token de acceso es comprometido, su vida útil limitada reduce el riesgo.
    - Proporciona una mejor experiencia de usuario al evitar múltiples inicios de sesión.
    - Es un estándar en la mayoría de sistemas que implementan autenticación basada en tokens (e.g., OAuth 2.0).
- **DTO**: `RefreshAccessTokenDTO`
    - **Parámetros**:
        - `refreshToken`: `string` – Refresh Token proporcionado al usuario en su último inicio de sesión.
- **Retorno**:
    - `AccessTokenResponseDTO`:
        - `accessToken`: `string` – Nuevo token de acceso.
        - `refreshToken`: `string` – Nuevo Refresh Token (opcional, dependiendo de la estrategia de renovación).

---

### **12. InvalidateRefreshToken**

- **Nombre en inglés**: `InvalidateRefreshToken`
- **Propósito**:
    - Revocar un Refresh Token para invalidar futuras solicitudes de renovación de tokens.
- **Por qué es necesario**:
    - Permite al sistema revocar el acceso de usuarios comprometidos.
    - Mejora la seguridad al proporcionar un mecanismo para invalidar tokens después de un cierre de sesión o actividad sospechosa.
- **DTO**: `InvalidateRefreshTokenDTO`
    - **Parámetros**:
        - `refreshToken`: `string` – Refresh Token a invalidar.
- **Retorno**:
    - `boolean` – Indica si el Refresh Token fue invalidado exitosamente.
