# Implementacion del modo logo

## Objetivo del documento

Explicar como deberia funcionar el modo logo de Codle a nivel de backend, API y frontend, para que el equipo tenga una guia clara antes de terminar este modo.

La idea es dejar definido:

- como se juega
- que datos necesita cada parte
- que endpoints hacen falta
- que debe hacer Cesar en frontend
- que debe hacer David e Ibai en backend

## Idea general del modo logo

En el modo logo, el usuario debe adivinar un lenguaje de programacion viendo solo su logo.

La diferencia con el modo clasico es que aqui la pista principal no son atributos como año o paradigma, sino la propia imagen del lenguaje.

La mecanica propuesta es esta:

1. El usuario entra al modo logo.
2. El backend crea una partida nueva.
3. El backend elige un lenguaje objetivo aleatorio que tenga `logo_path`.
4. El frontend muestra el logo con bastante zoom.
5. El usuario escribe un lenguaje.
6. Si falla, el backend guarda el intento.
7. El frontend reduce un poco el zoom de la imagen.
8. El proceso se repite hasta que el usuario acierta.
9. Cuando acierta, la partida se marca como ganada y se muestra el logo completo.

## Comportamiento visual del zoom

La propuesta mas simple y mantenible es que el backend no tenga que calcular estilos visuales.

Lo recomendable es:

- el backend guarda solo el numero de intentos usados
- el frontend calcula el zoom visual a partir de ese numero

### Regla visual recomendada

Se puede definir un zoom inicial fuerte y quitarlo por pasos.

Por ejemplo:

- intento 0: escala `2.6`
- intento 1: escala `2.2`
- intento 2: escala `1.9`
- intento 3: escala `1.6`
- intento 4: escala `1.35`
- intento 5 o mas: escala `1`

Otra opcion es usar una formula en lugar de una tabla fija.

Ejemplo:

```text
zoom = max(1, 2.6 - intentos_usados * 0.3)
```

La tabla fija suele ser mejor para frontend porque permite ajustar la sensacion visual con mas control.

## Tablas que intervienen

Para implementar este modo ya existen las tablas necesarias:

- `usuario`
- `lenguaje`
- `lenguaje_alias`
- `partida`
- `intento_lenguaje`

### Papel de cada tabla

- `usuario`
  - identifica quien esta jugando

- `lenguaje`
  - contiene el lenguaje objetivo y su `logo_path`

- `lenguaje_alias`
  - permite aceptar respuestas equivalentes como `js`, `javascript`, `c#`, `c sharp`, etc.

- `partida`
  - guarda la sesion de juego del usuario

- `intento_lenguaje`
  - guarda cada intento realizado durante esa partida

## Datos minimos que necesita el frontend

El frontend del modo logo necesita:

- `partida_id`
- `estado`
- `intentos_usados`
- `logoUrl` del lenguaje objetivo
- historial de intentos si se quiere reconstruir la pantalla al recargar

## Flujo general del backend

El backend del modo logo deberia tener tres piezas principales:

1. Crear partida
2. Registrar intento
3. Consultar estado de partida

## 1. Crear partida

### Endpoint propuesto

```text
POST /logo/crear_partida
```

### Que hace este endpoint

Cuando el usuario entra al modo logo, el frontend debe llamar a este endpoint.

El backend debe:

1. Identificar al usuario autenticado.
2. Elegir un lenguaje objetivo aleatorio que tenga logo.
3. Crear una nueva fila en `partida`.
4. Devolver al frontend:
   - `partida_id`
   - `modo`
   - `estado`
   - `logoUrl`

### Regla importante al elegir el lenguaje

No deberia elegirse cualquier lenguaje activo sin mas.

Lo recomendable es filtrar por:

- `activo = true`
- `logo_path` no nulo
- `logo_path` no vacio

Asi se evita crear partidas imposibles de jugar.

### Campos recomendados al crear la partida

- `usuario_id`
- `modo = "LOGO"`
- `lenguaje_objetivo_id`
- `estado = "en_curso"`
- `fase_actual = "logo"`
- `max_intentos = null`
- `intentos_usados = 0`
- `puntuacion = 0`

### Respuesta esperada

```json
{
  "partida_id": 24,
  "modo": "LOGO",
  "estado": "en_curso",
  "logoUrl": "https://.../python.png"
}
```

## 2. Registrar intento

### Endpoint propuesto

```text
POST /logo/guess
```

### Entrada esperada

```json
{
  "partida_id": 24,
  "respuesta": "Python"
}
```

### Que hace este endpoint

Cada vez que el usuario escribe un lenguaje, el backend debe:

1. Comprobar que la partida existe.
2. Comprobar que la partida sigue en curso.
3. Comprobar que pertenece al modo logo.
4. Buscar la respuesta del usuario en `lenguaje_alias`.
5. Si no existe alias, buscar por nombre de lenguaje.
6. Comparar el lenguaje intentado con el objetivo.
7. Guardar el intento en `intento_lenguaje`.
8. Actualizar `intentos_usados` en `partida`.
9. Si acierta, marcar la partida como `ganada`.
10. Devolver el resultado al frontend.

### Respuesta esperada si falla

```json
{
  "partida_id": 24,
  "numero_intento": 3,
  "estado_partida": "en_curso",
  "correcto": false,
  "intentos_usados": 3,
  "lenguaje_intentado": {
    "id": 5,
    "nombre": "Python",
    "logoUrl": "https://.../python.png"
  }
}
```

### Respuesta esperada si acierta

```json
{
  "partida_id": 24,
  "numero_intento": 4,
  "estado_partida": "ganada",
  "correcto": true,
  "intentos_usados": 4,
  "lenguaje_intentado": {
    "id": 3,
    "nombre": "JavaScript",
    "logoUrl": "https://.../js.png"
  }
}
```

## 3. Consultar estado de partida

### Endpoint propuesto

```text
GET /logo/{partida_id}
```

### Que hace este endpoint

Devuelve el estado actual de la partida para que el frontend pueda reconstruir la pantalla si el usuario recarga o vuelve a entrar.

### Informacion recomendable en la respuesta

- `partida_id`
- `modo`
- `estado`
- `intentos_usados`
- `logoUrl`
- historial de intentos

### Respuesta esperada

```json
{
  "partida": {
    "id": 24,
    "modo": "LOGO",
    "estado": "en_curso",
    "intentos_usados": 2
  },
  "logoUrl": "https://.../python.png",
  "intentos": [
    {
      "numeroIntento": 1,
      "lenguaje": {
        "id": 1,
        "nombre": "Java",
        "logoUrl": "https://.../java.png"
      },
      "correcto": false
    }
  ]
}
```

## Logica recomendada en frontend

El frontend no necesita saber cual es el lenguaje objetivo.

Solo necesita:

- `logoUrl`
- `intentos_usados`
- `estado`

Con eso puede calcular el nivel de zoom y redibujar la interfaz.

### Estado recomendado en React

- `textoBusqueda`
- `catalogoLenguajes`
- `intentos`
- `partidaId`
- `logoUrl`
- `mensajeError`
- `mensajeAcierto`
- `cargando`
- `enviandoIntento`

### Comportamiento visual recomendado

- al iniciar partida, mostrar la imagen con zoom fuerte
- tras cada fallo, recalcular el zoom
- al acertar:
  - poner zoom `1`
  - desactivar input
  - mostrar mensaje de victoria

## Formula o tabla de zoom

La opcion recomendada es una funcion utilitaria en frontend.


## Orden recomendado de implementacion

1. Crear `POST /logo/crear_partida`
2. Hacer la funcion que elige un lenguaje con logo
3. Hacer la funcion que devuelve `logoUrl`
4. Implementar `POST /logo/guess`
5. Guardar intentos en `intento_lenguaje`
6. Actualizar correctamente `partida`
7. Crear `GET /logo/{partida_id}`
8. Construir la pantalla del modo logo en frontend
9. Conectar zoom + sugerencias + envio
10. Probar de extremo a extremo

## Reparto de tareas del equipo

### Cesar

- crear la estructura principal de la pantalla del modo logo
- preparar el input de respuesta
- mostrar sugerencias de lenguajes
- montar el historial visual de intentos
- coordinar la interfaz general del modo logo
- integrar la parte visual principal con el trabajo de David

### David

- apoyar a Cesar en el frontend del modo logo
- conectar la pantalla con `POST /logo/crear_partida`
- conectar la pantalla con `POST /logo/guess`
- consumir `GET /logo/{partida_id}` para reconstruir la sesion
- mostrar la imagen usando `logoUrl`
- implementar el comportamiento del zoom segun `intentos_usados`
- mostrar el nombre y logo del lenguaje intentado cuando el usuario falle
- mostrar el estado de victoria cuando se acierte
- validar que al recargar se reconstruye correctamente el estado del juego
- apoyar en las pruebas de integracion frontend-backend

### Backend de apoyo

- implementar `POST /logo/crear_partida`
- hacer la seleccion aleatoria de un lenguaje con logo
- asegurarse de que el lenguaje elegido siempre tiene `logo_path`
- devolver `logoUrl` listo para frontend
- implementar `GET /logo/{partida_id}`
- devolver el estado completo de partida necesario para reconstruir la vista
- ayudar a mantener consistente el contrato de respuesta de la API

### Ibai

- implementar `POST /logo/guess`
- reutilizar la logica ya hecha en clasico para resolver alias o nombre
- validar que la partida pertenece al modo logo
- guardar intentos en `intento_lenguaje`
- actualizar `intentos_usados`
- marcar la partida como `ganada` cuando corresponda
- devolver una respuesta simple y estable para que Cesar no dependa de detalles internos
- coordinar la integracion entre front y backend

## Contrato minimo que deberia quedar estable antes de integrar frontend

- respuesta exacta de `POST /logo/crear_partida`
- respuesta exacta de `POST /logo/guess`
- respuesta exacta de `GET /logo/{partida_id}`
- nombre del campo `logoUrl`
- nombre del campo `intentos_usados` o equivalente
- formato del historial de intentos

## Riesgos y decisiones importantes

### 1. No enviar el lenguaje objetivo

El backend no debe enviar al frontend el lenguaje objetivo ni su nombre.

Debe enviar solo:

- `logoUrl`
- `estado`
- `intentos_usados`

### 2. Elegir lenguajes sin logo

Esto debe evitarse al crear la partida

## Hito siguiente recomendado

El siguiente hito del proyecto deberia ser:

**Modo logo jugable de extremo a extremo con zoom progresivo, usuario autenticado y guardado de intentos**

Eso significa que un usuario pueda:

- iniciar sesion
- entrar al modo logo
- ver una imagen con zoom
- hacer intentos
- ver como el zoom baja tras cada fallo
- acertar
- y que todo quede registrado en base de datos
