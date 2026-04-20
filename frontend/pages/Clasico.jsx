import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  crearPartida,
  obtenerPartida,
  obtenerLenguajeById,
  obtenerLenguajesActivos,
  enviarIntento as enviarIntentoApi,
} from "../api/api";
import "./Clasico.css";

// Array de modos disponibles para poder cambiar entre ellos
const MODOS = [
  { clave: "clasico", etiqueta: "Clasico", icono: "?", ruta: "/clasico" },
  { clave: "logo", etiqueta: "Logo", icono: "◎", ruta: "/logo" },
  { clave: "codigo", etiqueta: "Codigo", icono: "</>", ruta: "/codigo" },
];

// Esta funcion coge el nombre de un lenguaje y saca sus iniciales (máximo 2).
// Por ejemplo: "Python" da "Py", "JavaScript" da "Ja".
// Se usa para mostrar en la celda del logo si no tenemos imagen disponible.
function sacarIniciales(texto) {
  return texto
    .split(/\s+/)
    .map(function (parte) {
      return parte[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Comprueba si hay algun elemento en comun entre dos listas (ignora mayusculas/minusculas).
// En este caso, lo usaremos para ver si hay coincidencia parcial en los creadores.
function hayCoincidenciaParcial(listaA, listaB) {
  const listaBNormalizada = new Set(
    listaB.map(function (valor) {
      return valor.toLowerCase();
    }),
  );

  for (const valor of listaA) {
    if (listaBNormalizada.has(valor.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// Funcion principal que compara el lenguaje que intento el usuario con el objetivo.
// Devuelve un objeto con los estados de cada atributo: correcto, parcial, incorrecto, alto (año menor) o bajo (año mayor).
// Es la lógica principal para el feedback que se muestra cuando aciertas o fallas.
function construirResultadoIntento(lenguajeIntentado, lenguajeObjetivo) {
  // Comparamos el año de creacion. Si es menor que el objetivo, es "alto", si es mayor es "bajo".
  let estadoAnio = "incorrecto";
  if (lenguajeIntentado.anioCreacion === lenguajeObjetivo.anioCreacion) {
    estadoAnio = "correcto";
  } else if (lenguajeIntentado.anioCreacion < lenguajeObjetivo.anioCreacion) {
    estadoAnio = "alto";
  } else {
    estadoAnio = "bajo";
  }

  // Paradigma: en la base de datos es un string único por lenguaje, sólo puede ser correcto o incorrecto.
  let estadoParadigma = "incorrecto";
  if (lenguajeIntentado.paradigma === lenguajeObjetivo.paradigma) {
    estadoParadigma = "correcto";
  }

  // Puede haber varios creadores para un mismo lenguaje, por lo que usaremos la función de hay coincidencia parcial.
  let estadoCreador = "incorrecto";
  const esCreadorExacto =
    lenguajeIntentado.creadores.join("|") === lenguajeObjetivo.creadores.join("|");
  if (esCreadorExacto) {
    estadoCreador = "correcto";
  } else {
    const coincideParcialCreador = hayCoincidenciaParcial(
      lenguajeIntentado.creadores,
      lenguajeObjetivo.creadores,
    );
    if (coincideParcialCreador) {
      estadoCreador = "parcial";
    }
  }

  // Devuelve el lenguaje que intentó el usuario y estados, que contiene los valores usados
  // por la UI: "correcto" / "parcial" / "incorrecto" / "alto" / "bajo".
  return {
    // El objeto del lenguaje que el usuario intentó.
    lenguaje: lenguajeIntentado,

    // Estados por cada propiedad que usamos en la UI.
    estados: {
      // Nombre: comparamos por `id` para evitar falsos positivos por nombres similares.
      // Valor: "correcto" | "incorrecto"
      nombre:
        lenguajeIntentado.id === lenguajeObjetivo.id ? "correcto" : "incorrecto",

      // Año de creación: tomamos la variable `estadoAnio` calculada arriba.
      // Valor: "correcto" | "alto" | "bajo"
      anioCreacion: estadoAnio,

      // Valor: "correcto" | "incorrecto"
      ejecucion:
        lenguajeIntentado.ejecucion === lenguajeObjetivo.ejecucion
          ? "correcto"
          : "incorrecto",

      // Paradigma: usamos `estadoParadigma` (puede ser "correcto" o "incorrecto").
      // En nuestra BD `paradigma` es un string único por lenguaje.
      paradigma: estadoParadigma,

      // Tipado en tiempo de ejecución (Dinámico/Estático): igualación simple.
      // Valor: "correcto" | "incorrecto"
      tipadoTiempo:
        lenguajeIntentado.tipadoTiempo === lenguajeObjetivo.tipadoTiempo
          ? "correcto"
          : "incorrecto",

      // Fortaleza del tipado (por ejemplo "Fuerte" / "Debil").
      // Valor: "correcto" | "incorrecto"
      fortalezaTipado:
        lenguajeIntentado.fortalezaTipado === lenguajeObjetivo.fortalezaTipado
          ? "correcto"
          : "incorrecto",

      // Creadores: usamos `estadoCreador` que puede ser "correcto", "parcial" o "incorrecto".
      creadores: estadoCreador,
    },
  };
}

// Componente que renderiza una celda de estado. Muestra el contenido con el color correspondiente.
// Si es "alto" o "bajo" (para el año) muestra una flecha arriba o abajo.
function CeldaEstado(props) {
  const estado = props.estado;
  let flecha = "";

  // Solo mostramos flecha si es alto (año anterior) o bajo (año posterior).
  if (estado === "alto") {
    flecha = "↑";
  }
  if (estado === "bajo") {
    flecha = "↓";
  }

  return (
    <div className={`classic-cell classic-${estado}`}>
      <span>{props.children}</span>
      {flecha ? <strong className="classic-arrow">{flecha}</strong> : null}
    </div>
  );
}

// Componente especial para mostrar el logo del lenguaje en la tabla.
// Si el lenguaje tiene logoUrl muestra la imagen, si no muestra un cuadradito con las iniciales.
// Al pasar el ratón encima aparece el nombre completo del lenguaje como tooltip flotante.
function CeldaLenguaje(props) {
  const lenguaje = props.lenguaje;
  let logo;

  // Decidimos si mostrar imagen o solo iniciales segun si tenemos URL.
  if (lenguaje.logoUrl) {
    logo = (
      <img
        src={lenguaje.logoUrl}
        alt={`Logo de ${lenguaje.nombre}`}
        className="classic-logo-imagen"
      />
    );
  } else {
    logo = <div className="classic-logo-relleno">{sacarIniciales(lenguaje.nombre)}</div>;
  }

  return (
    <div className={`classic-cell classic-${props.estado}`}>
      <div className="classic-logo-zona">
        {logo}
        <span className="classic-logo-tooltip">{lenguaje.nombre}</span>
      </div>
    </div>
  );
}

export default function Clasico() {
  const navegar = useNavigate();

  // --- Estados de la interfaz visual ---
  // Almacena el texto que escribe el usuario en el buscador.
  const [textoBusqueda, setTextoBusqueda] = useState("");
  // Lista de nombres de lenguajes disponibles (sin intentar aún).
  // Se carga desde /getData/lengAll al inicializar.
  const [lenguajesDisponibles, setLenguajesDisponibles] = useState([]);
  // Historial de todos los intentos que hace el usuario. Se muestra en la tabla de abajo.
  const [intentos, setIntentos] = useState([]);
  // Mensaje de error si algo sale mal (lenguaje no valido, etc).
  const [mensajeError, setMensajeError] = useState("");
  // Mensaje de acierto cuando el usuario adivina correctamente el lenguaje.
  const [mensajeAcierto, setMensajeAcierto] = useState("");

  // --- Estados de autenticación y partida (conectados al backend) ---
  // Token JWT del usuario autenticado. Se obtiene de localStorage.
  const [token, setToken] = useState("");
  // ID de la partida creada en el backend. Se usa para identificar la sesión de juego.
  const [partidaId, setPartidaId] = useState(null);
  // El lenguaje secreto que el usuario debe adivinar. Se obtiene del backend.
  const [lenguajeObjetivo, setLenguajeObjetivo] = useState(null);
  // Indicador de carga mientras se inicializa la partida desde el backend.
  const [cargando, setCargando] = useState(true);

  // useEffect para inicializar partida desde backend
  useEffect(
    function () {
      async function inicializarPartida() {
        try {
          const tokenGuardado = localStorage.getItem("access_token");
          if (!tokenGuardado) {
            setMensajeError("No estás autenticado. Redirigiendo a login...");
            setTimeout(() => navegar("/"), 2000);
            setCargando(false);
            return;
          }

          setToken(tokenGuardado);

          // Crear partida en backend
          const respuestaPartida = await crearPartida(tokenGuardado);
          const newPartidaId = respuestaPartida.partida_id;
          setPartidaId(newPartidaId);

          // Obtener datos de la partida
          const datosPartida = await obtenerPartida(newPartidaId, tokenGuardado);
          const lenguajeObjetivoId = datosPartida.partida.lenguaje_objetivo_id;

          // Cargar el lenguaje objetivo desde el backend por ID
          try {
            const lenguajeObjetivoData = await obtenerLenguajeById(lenguajeObjetivoId);
            setLenguajeObjetivo(lenguajeObjetivoData[0]);
          } catch (error) {
            console.error("Error obtener lenguaje del backend:", error);
            setMensajeError("Error al cargar el lenguaje objetivo");
            setCargando(false);
            return;
          }

          // Cargar todos los lenguajes activos disponibles desde el backend
          try {
            const lenguajesActivos = await obtenerLenguajesActivos();
            const nombres = [];

            for (const lenguaje of lenguajesActivos) {
              nombres.push(lenguaje.nombre);
            }

            setLenguajesDisponibles(nombres);
          } catch (error) {
            console.error("Error al obtener lenguajes activos:", error);
            setMensajeError("Error al cargar la lista de lenguajes");
            setCargando(false);
            return;
          }

          setCargando(false);
        } catch (error) {
          console.error("Error al inicializar partida:", error);
          setMensajeError(
            error.message || "Error al cargar la partida. Intenta de nuevo."
          );
          setCargando(false);
        }
      }

      inicializarPartida();
    },
    [navegar]
  );

  // Calcula las sugerencias mientras el usuario escribe en el buscador.
  // Solo muestra lenguajes disponibles que empiezan por lo que escribio (máximo 8).
  // Se usa useMemo para evitar recalcular en cada render si no cambian las dependencias.
  const sugerencias = useMemo(
    function () {
      const textoNormalizado = textoBusqueda.trim().toLowerCase();
      if (!textoNormalizado) {
        return [];
      }

      return lenguajesDisponibles
        .filter(function (nombreLenguaje) {
          return nombreLenguaje.toLowerCase().startsWith(textoNormalizado);
        })
        .slice(0, 8);
    },
    [textoBusqueda, lenguajesDisponibles],
  );

  // Maneja cuando se envía un intento de lenguaje válido.
  // Envía la respuesta al backend, que valida, calcula feedback, persiste y devuelve el resultado.
  async function procesarIntento(nombreLenguaje) {
    // Si ya ha acertado, no permitir más intentos.
    if (mensajeAcierto) {
      return;
    }

    // Comprobamos que tenemos los datos necesarios cargados.
    if (!lenguajeObjetivo || !token || !partidaId) {
      setMensajeError("Error en la carga de la partida. Recarga la página.");
      return;
    }

    const nombreNormalizado = nombreLenguaje.trim();
    if (!nombreNormalizado) {
      return;
    }

    // Validar que el lenguaje está en la lista disponible (no se ha intentado ya).
    const lenguajeExistente = lenguajesDisponibles.find(function (nombre) {
      return nombre.toLowerCase() === nombreNormalizado.toLowerCase();
    });

    if (!lenguajeExistente) {
      setMensajeError("Selecciona un lenguaje valido de la lista.");
      return;
    }

    setMensajeError("");

    try {
      // Enviar el intento al backend usando la API. El servidor:
      // - Resuelve el nombre/alias a un lenguaje
      // - Calcula el feedback (comparación con objetivo)
      // - Persiste el intento en BD
      // - Actualiza la partida (intentos_usados, estado, etc)
      // - Devuelve el resultado oficial con feedback
      const resultadoServidor = await enviarIntentoApi(partidaId, nombreNormalizado, token);

      // El backend devuelve el lenguaje ya formateado para la UI, así evitamos reconstruirlo aquí.
      const intentoData = {
        numeroIntento: resultadoServidor.numero_intento,
        lenguaje: resultadoServidor.lenguaje_intentado,
        estados: {
          nombre: resultadoServidor.resultado.correcto ? "correcto" : "incorrecto",
          anioCreacion: resultadoServidor.resultado.feedback.anio_creacion,
          ejecucion: resultadoServidor.resultado.feedback.ejecucion ? "correcto" : "incorrecto",
          paradigma: resultadoServidor.resultado.feedback.paradigma ? "correcto" : "incorrecto",
          tipadoTiempo: resultadoServidor.resultado.feedback.tipado_tiempo ? "correcto" : "incorrecto",
          fortalezaTipado: resultadoServidor.resultado.feedback.fortaleza_tipado ? "correcto" : "incorrecto",
          creadores: resultadoServidor.resultado.feedback.creadores ?? "incorrecto",
        },
      };

      // Agregar el intento al historial (al principio de la lista).
      setIntentos(function (anterior) {
        return [intentoData, ...anterior];
      });

      // Quitar el lenguaje de la lista disponible.
      setLenguajesDisponibles(function (anterior) {
        return anterior.filter(function (nombre) {
          return nombre.toLowerCase() !== nombreNormalizado.toLowerCase();
        });
      });

      // Limpiar el buscador para el siguiente intento.
      setTextoBusqueda("");

      // Si el intento es correcto, mostrar mensaje de acierto.
      if (resultadoServidor.resultado.correcto) {
        setMensajeAcierto("¡Has acertado el lenguaje!");
      }
    } catch (error) {
      console.error("Error al enviar intento:", error);
      setMensajeError(error.message || "Error al procesar el intento. Intenta de nuevo.");
    }
  }

  // Maneja cuando el usuario presiona Enter o hace click en el boton de enviar.
  // Intenta enviar el intento usando diferentes estrategias de coincidencia.
  function enviarFormulario(evento) {
    evento.preventDefault();

    if (lenguajesDisponibles.length === 0) {
      setMensajeError("No hay lenguajes cargados todavia.");
      return;
    }

    const textoNormalizado = textoBusqueda.trim();
    
    // Buscar coincidencia exacta en el nombre del lenguaje (ignora mayúsculas).
    const coincidenciaExacta = lenguajesDisponibles.find(function (nombreLenguaje) {
      return nombreLenguaje.toLowerCase() === textoNormalizado.toLowerCase();
    });

    // Si escribio exactamente el nombre de un lenguaje disponible, lo enviamos.
    if (coincidenciaExacta) {
      procesarIntento(coincidenciaExacta);
      return;
    }

    // Si hay sugerencias, tomamos la primera y la enviamos.
    // Esto permite que al presionar Enter se envíe la primera sugerencia mostrada.
    if (sugerencias.length > 0) {
      procesarIntento(sugerencias[0]);
      return;
    }

    setMensajeError("No hay coincidencias para ese lenguaje.");
  }

  // Solo mostramos el desplegable de sugerencias si hay texto escrito y tenemos coincidencias.
  let haySugerencias = false;
  if (textoBusqueda.trim() && sugerencias.length > 0 && !mensajeAcierto) {
    haySugerencias = true;
  }

  // Mostrar estado de carga mientras se inicializa la partida desde el backend
  if (cargando) {
    return (
      <section className="classic-page">
        <p style={{ textAlign: "center", padding: "2rem" }}>Cargando partida...</p>
      </section>
    );
  }

  // Mostrar error si no se pudo cargar la partida
  if (!lenguajeObjetivo) {
    return (
      <section className="classic-page">
        <p style={{ textAlign: "center", padding: "2rem", color: "red" }}>
          {mensajeError || "Error al cargar la partida"}
        </p>
      </section>
    );
  }

  // Seccion visual: layout principal de la página.
  // A continuación se renderizan las distintas zonas: selector de modos, introducción,
  // buscador con sugerencias, mensajes de estado, historial de intentos y leyenda.
  return (
    <section className="classic-page">
      {/* Selector de modos (Clasico / Logo / Codigo) */}
      <div className="classic-mode-strip" aria-label="Selector de modos">
        {MODOS.map(function (modo) {
          const estaActivo = modo.clave === "clasico";
          let clase = "classic-mode-pill";
          if (estaActivo) {
            clase += " is-active";
          }

          return (
            <button
              key={modo.clave}
              type="button"
              className={clase}
              onClick={function () {
                navegar(modo.ruta);
              }}
              aria-current={estaActivo ? "page" : undefined}
            >
              <span className="classic-mode-icon">{modo.icono}</span>
              <span>{modo.etiqueta}</span>
            </button>
          );
        })}
      </div>

      {/* Caja de introducción y título (explica brevemente el juego) */}
      <article className="classic-intro-box">
        <h1>¡Adivina el lenguaje!</h1>
      </article>

      {/* Buscador: input, botón de enviar y lista de sugerencias.
          `disabled` se activa cuando el usuario ya ha acertado para bloquear interacción. */}
      <form className="classic-search-wrap" onSubmit={enviarFormulario}>
        <div className="classic-input-shell">
          <input
            type="text"
            value={textoBusqueda}
            onChange={function (evento) {
              setTextoBusqueda(evento.target.value);
              if (mensajeError) {
                setMensajeError("");
              }
            }}
            placeholder="Escribe el nombre del lenguaje"
            aria-label="Buscar lenguaje"
            autoComplete="off"
            disabled={Boolean(mensajeAcierto)}
          />
          <button
            type="submit"
            className="classic-submit"
            disabled={Boolean(mensajeAcierto)}
          >
            ▶
          </button>
        </div>

        {/* Lista de sugerencias que aparece mientras el usuario escribe */}
        {haySugerencias ? (
          <ul
            className="classic-suggestion-list"
            role="listbox"
            aria-label="Sugerencias de lenguajes"
          >
            {sugerencias.map(function (nombreLenguaje) {
              return (
                <li key={nombreLenguaje}>
                  <button
                    type="button"
                    className="classic-suggestion-item"
                    onClick={function () {
                      // Al hacer click en una sugerencia enviamos ese intento directamente.
                      procesarIntento(nombreLenguaje);
                    }}
                  >
                    <span className="classic-avatar">{sacarIniciales(nombreLenguaje)}</span>
                    <span>{nombreLenguaje}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </form>

      {/* Mensajes de estado: error o acierto. Aparecen solo si contienen texto. */}
      {mensajeError ? <p className="classic-error">{mensajeError}</p> : null}
      {mensajeAcierto ? <p className="classic-success">{mensajeAcierto}</p> : null}

      {/* Estado cuando no hay lenguajes disponibles, por si hay algún error de backend. */}
      {lenguajesDisponibles.length === 0 ? (
        <p className="classic-empty-state-api">
          Lista de lenguajes vacia.
        </p>
      ) : null}

      {/* Historial de intentos: tabla con resultados de cada intento. Cada fila representa
          un intento y usa las clases `classic-*` para colorear los estados según `estados`. */}
      <section className="classic-results" aria-label="Historial de intentos">
        <header className="classic-results-header">
          <span>Lenguaje</span>
          <span>Anio</span>
          <span>Ejecucion</span>
          <span>Paradigma</span>
          <span>Tipado</span>
          <span>Fortaleza</span>
          <span>Creador</span>
        </header>

        {intentos.length === 0 ? (
          <p className="classic-empty">Todavia no hay intentos.</p>
        ) : (
          intentos.map(function (intento) {
            return (
              <div key={intento.numeroIntento ?? intento.lenguaje.id} className="classic-results-row">
                <CeldaLenguaje
                  lenguaje={intento.lenguaje}
                  estado={intento.estados.nombre}
                />
                <CeldaEstado estado={intento.estados.anioCreacion}>
                  {intento.lenguaje.anioCreacion}
                </CeldaEstado>
                <CeldaEstado estado={intento.estados.ejecucion}>
                  {intento.lenguaje.ejecucion}
                </CeldaEstado>
                <CeldaEstado estado={intento.estados.paradigma}>
                  {intento.lenguaje.paradigma}
                </CeldaEstado>
                <CeldaEstado estado={intento.estados.tipadoTiempo}>
                  {intento.lenguaje.tipadoTiempo}
                </CeldaEstado>
                <CeldaEstado estado={intento.estados.fortalezaTipado}>
                  {intento.lenguaje.fortalezaTipado}
                </CeldaEstado>
                <CeldaEstado estado={intento.estados.creadores}>
                  {intento.lenguaje.creadores.join(", ")}
                </CeldaEstado>
              </div>
            );
          })
        )}
      </section>

      {/* Leyenda: explicación de colores y flechas */}
      <aside className="classic-legend" aria-label="Indicadores de color">
        <h2>Indicadores de color</h2>
        <ul>
          <li>
            <span className="legend-chip classic-correcto" />
            <span>Correcto</span>
          </li>
          <li>
            <span className="legend-chip classic-parcial" />
            <span>Parcial</span>
          </li>
          <li>
            <span className="legend-chip classic-incorrecto" />
            <span>Incorrecto</span>
          </li>
          <li>
            <span className="legend-chip classic-alto">↑</span>
            <span>Mas alto</span>
          </li>
          <li>
            <span className="legend-chip classic-bajo">↓</span>
            <span>Mas bajo</span>
          </li>
        </ul>
      </aside>
    </section>
  );
}
