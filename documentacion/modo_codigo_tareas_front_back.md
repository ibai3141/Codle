# Tareas del modo código

## Objetivo del modo

En el modo código se muestra un fragmento de código y el usuario debe adivinar la salida que produce.

Decisiones ya tomadas:

- la respuesta correcta será la salida del `snippet`
- la comparación no será literal bruta, sino con normalización de espacios y saltos de línea
- habrá límite de intentos
- habrá un máximo de `2` cambios de fragmento
- cambiar de fragmento no consumirá intento

## Tareas de backend

- definir el flujo completo del modo código
- crear la lógica para seleccionar un `reto_codigo` aleatorio
- implementar una función `normalizar_salida(...)`
- normalizar la respuesta del usuario antes de compararla
- normalizar también la `salida_esperada`
- comparar ambas salidas tras la normalización
- crear el endpoint `POST /codigo/crear_partida`
- guardar en la partida:
  - `usuario_id`
  - `modo = CODIGO`
  - `reto_codigo_id`
  - `estado`
  - `max_intentos`
  - `intentos_usados`
  - `cambios_restantes`
- crear el endpoint `GET /codigo/{partida_id}`
- devolver:
  - datos de la partida
  - `snippet`
  - intentos usados
  - intentos restantes
  - cambios restantes
  - historial de intentos
- crear el endpoint `POST /codigo/guess`
- validar que la partida pertenezca al usuario autenticado
- comprobar que la partida siga en curso
- comparar la respuesta con la salida esperada
- guardar el intento en base de datos
- actualizar `intentos_usados`
- marcar la partida como `ganada` si acierta
- marcar la partida como `perdida` si se agotan los intentos
- crear el endpoint `POST /codigo/cambiar_fragmento`
- comprobar que aún quedan cambios disponibles
- seleccionar un nuevo reto distinto al actual si es posible
- actualizar `reto_codigo_id`
- reducir `cambios_restantes`
- evitar que cambiar fragmento cuente como intento
- definir un formato JSON claro y estable para las respuestas
- probar desde backend:
  - respuesta correcta
  - respuesta incorrecta
  - token inválido
  - límite de intentos alcanzado
  - cambio de fragmento
  - cambios agotados

## Tareas de frontend

- crear la pantalla del modo código
- mostrar el `snippet` recibido desde backend
- crear el campo donde el usuario escribirá la salida
- decidir si el campo será `input` o `textarea`
- mostrar los intentos restantes
- mostrar los cambios restantes
- conectar la pantalla con `POST /codigo/crear_partida`
- conectar la recuperación con `GET /codigo/{partida_id}`
- conectar el envío de respuesta con `POST /codigo/guess`
- conectar el botón de cambiar fragmento con `POST /codigo/cambiar_fragmento`
- mostrar mensajes de:
  - respuesta correcta
  - respuesta incorrecta
  - partida ganada
  - partida perdida
  - sin cambios disponibles
- actualizar la interfaz tras cada intento
- actualizar la interfaz cuando se cambie de fragmento
- limpiar o reiniciar el campo de respuesta al cambiar de fragmento
- reconstruir la partida si el usuario recarga la página
- bloquear interacciones si la partida ya terminó
- comprobar visualmente que el flujo sea claro para el usuario

## Orden recomendado de trabajo

1. preparar endpoints base de backend
2. implementar normalización y validación de salida
3. implementar intentos y estados de partida
4. implementar cambio de fragmento
5. montar la pantalla del frontend
6. conectar frontend y backend
7. probar el flujo completo

## Hito del modo código

- modo código funcional con validación de salida, límite de intentos y cambio de fragmento
