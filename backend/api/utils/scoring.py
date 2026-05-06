PUNTUACION_CONFIG = {
   "CLASICO": {
      "puntuacion_inicial": 100,
      "penalizacion_por_intento": 10,
      "cuenta_primer_intento": False,
   },
   "LOGO": {
      "puntuacion_inicial": 100,
      "penalizacion_por_intento": 20,
      "cuenta_primer_intento": True,
   },
   "CODIGO": {
      "puntuacion_inicial": 100,
      "penalizacion_por_intento": 20,
      "cuenta_primer_intento": True,
      "max_intentos": 10,
   },
}


def obtener_config_puntuacion(modo):
   return PUNTUACION_CONFIG.get(modo)



def calcular_puntuacion(modo, numero_intento):
   config = obtener_config_puntuacion(modo)
   penalizacion = int(config["penalizacion_por_intento"])
   puntuacion_inicial = int(config["puntuacion_inicial"])
   cuenta_primer = bool(config["cuenta_primer_intento"])

   # Si el primer intento no cuenta, no penalizamos el primer intento fallido.
   intentos_contables = numero_intento if cuenta_primer else max(0, numero_intento - 1)
   puntuacion = puntuacion_inicial - penalizacion * intentos_contables
   return max(0, puntuacion)
