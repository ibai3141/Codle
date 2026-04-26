# Problema de autocompletado y envio de intentos en el modo clasico

## Contexto

Durante las pruebas funcionales del modo clasico se detectaron varios comportamientos inconsistentes al escribir un lenguaje y pulsar `Enter`.

El usuario podia encontrarse con situaciones como:

- el lenguaje parecia seleccionarse correctamente desde la lista
- a veces el intento no se enviaba como se esperaba
- a veces se mostraba un error indicando que el lenguaje no existia
- en algunos casos se podia repetir un lenguaje ya usado
- la sugerencia visible en pantalla no siempre coincidia con lo que realmente acababa resolviendo el backend

Este problema afectaba directamente a la experiencia de juego y hacia que el flujo del modo clasico pareciera inestable.

## Problema detectado

El origen del fallo estaba en que el autocompletado y el envio real del intento no seguian exactamente la misma logica.

### 1. El frontend sugeria por una regla

El desplegable de sugerencias filtraba los lenguajes disponibles comprobando si el nombre empezaba por el texto escrito por el usuario.

Esto significaba que la lista visual se basaba solo en coincidencias por prefijo del nombre.

### 2. El envio al backend seguia otra regla

Cuando el usuario pulsaba `Enter`, si no habia una coincidencia exacta con un nombre visible en la lista, el frontend enviaba el texto tal cual al backend.

El backend, por su parte, resolvia el intento utilizando:

- nombre del lenguaje
- alias normalizados

De esta forma, la interfaz y la logica real no estaban sincronizadas.

### 3. Se podian repetir lenguajes

Aunque el historial visual evitaba algunos duplicados, el backend no estaba bloqueando de forma estricta que un mismo lenguaje ya intentado volviera a enviarse en la misma partida.

Esto podia ocurrir:

- escribiendo el mismo nombre otra vez
- escribiendolo con distinta capitalizacion
- o resolviendolo por alias en lugar de por nombre

## Consecuencias

Esta desalineacion entre interfaz y logica interna provocaba:

- sensacion de comportamiento aleatorio al pulsar `Enter`
- errores de validacion poco claros
- dificultad para saber si el usuario realmente habia seleccionado una sugerencia
- posibilidad de repetir lenguajes ya usados

## Solucion aplicada

La correccion se hizo en dos niveles: frontend y backend.

### 1. Unificacion de la logica de envio en frontend

En [Clasico.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Clasico.jsx) se cambio el flujo para que el formulario no enviara texto libre sin control.

Ahora el comportamiento es:

- si el lenguaje ya fue intentado, se muestra error
- si existe una coincidencia exacta disponible, se usa esa
- si solo hay una sugerencia posible, se usa automaticamente
- si hay varias sugerencias, el usuario debe elegir una de la lista
- si no hay ninguna opcion valida, se muestra un mensaje de error claro

Con esto se evita que el frontend mande una cadena ambigua al backend.

### 2. Bloqueo de lenguajes repetidos en backend

En [clasico.py](/C:/Users/IbaiTituañaBuenaño/Codle/backend/api/clasico/clasico.py) se añadio una comprobacion antes de guardar el intento.

Esta validacion revisa si ya existe en la misma partida un intento con el mismo `lenguaje_intentado_id`.

Si existe, el backend responde con error controlado y no guarda un intento duplicado.

De este modo, aunque el frontend falle o se intente forzar la repeticion, la API protege la coherencia de la partida.

## Archivos modificados

- [Clasico.jsx](/C:/Users/IbaiTituañaBuenaño/Codle/frontend/pages/Clasico.jsx)
- [clasico.py](/C:/Users/IbaiTituañaBuenaño/Codle/backend/api/clasico/clasico.py)

## Resultado

Tras la correccion:

- el envio del intento es mas coherente con lo que ve el usuario en pantalla
- deja de haber mezcla entre sugerencia visual y texto libre ambiguo
- no se permite repetir un lenguaje ya intentado
- el flujo del modo clasico es mas estable y predecible

## Conclusion

Este problema demostro que en una interfaz con autocompletado no basta con mostrar sugerencias: tambien es necesario que la logica de envio siga exactamente el mismo criterio que la interfaz.

La solucion aplicada sincroniza mejor el comportamiento visual del frontend con la validacion real del backend y mejora la robustez general del modo clasico.
