import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clasico.css";

// Array de modos disponibles para poder cambiar entre ellos
const MODOS = [
  { clave: "clasico", etiqueta: "Clasico", icono: "?", ruta: "/clasico" },
  { clave: "logo", etiqueta: "Logo", icono: "◎", ruta: "/logo" },
  { clave: "codigo", etiqueta: "Codigo", icono: "</>", ruta: "/codigo" },
];

// Lista inicial de lenguajes. De momento tiene 2 de prueba para ver la interfaz funcionando.
// Cuando conectemos la API esto se rellenara con los datos reales del servidor.
const LENGUAJES_INICIALES = [
  {
    id: 1,
    nombre: "Python",
    anioCreacion: 1991,
    ejecucion: "Interpretado",
    // En la base de datos solo hay un paradigma por lenguaje (string), no lista.
    paradigma: "Multiparadigma",
    tipadoTiempo: "Dinamico",
    fortalezaTipado: "Fuerte",
    creadores: ["Guido van Rossum"],
  },
  {
    id: 2,
    nombre: "JavaScript",
    anioCreacion: 1995,
    ejecucion: "Interpretado",
    paradigma: "Multiparadigma",
    tipadoTiempo: "Dinamico",
    fortalezaTipado: "Debil",
    creadores: ["Brendan Eich"],
  },
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

  // Almacena el texto que escribe el usuario en el buscador.
  const [textoBusqueda, setTextoBusqueda] = useState("");
  // Lista de lenguajes disponibles que aun no ha intentado el usuario.
  // Cada vez que falla un intento, quitamos ese lenguaje de aqui.
  const [lenguajesDisponibles, setLenguajesDisponibles] =
    useState(LENGUAJES_INICIALES);
  // Historial de todos los intentos que hace el usuario. Se muestra en la tabla de abajo.
  const [intentos, setIntentos] = useState([]);
  // Mensaje de error si algo sale mal (lenguaje no valido, etc).
  const [mensajeError, setMensajeError] = useState("");
  // Mensaje de acierto cuando el usuario adivina correctamente el lenguaje.
  const [mensajeAcierto, setMensajeAcierto] = useState("");

  // El lenguaje que tiene que adivinar el usuario. De momento el primero de la lista porque no hay conexion API. 
  //TODO cargar esto desde el backend 
  const [lenguajeObjetivo] = useState(LENGUAJES_INICIALES[0]);

  // Calcula las sugerencias mientras el usuario escribe en el buscador.
  // Solo muestra lenguajes disponibles que empiezan por lo que escribio (máximo 8).
  //TODO añadir alias para que pueda escribir "js" y sugerir "JavaScript", etc.
  const sugerencias = useMemo(
    function () {
      const textoNormalizado = textoBusqueda.trim().toLowerCase();
      if (!textoNormalizado) {
        return [];
      }

      return lenguajesDisponibles
        .filter(function (lenguaje) {
          return lenguaje.nombre.toLowerCase().startsWith(textoNormalizado);
        })
        .slice(0, 8);
    },
    [textoBusqueda, lenguajesDisponibles],
  );

  function enviarIntento(nombreLenguaje) {
    if (mensajeAcierto) {
      return;
    }

    // Comprobamos que tenemos el lenguaje objetivo cargado.
    if (!lenguajeObjetivo) {
      setMensajeError("No se ha cargado el lenguaje objetivo.");
      return;
    }

    const nombreNormalizado = nombreLenguaje.trim().toLowerCase();
    if (!nombreNormalizado) {
      return;
    }

    // Buscamos el lenguaje en la lista disponible.
    const lenguajeSeleccionado = lenguajesDisponibles.find(function (lenguaje) {
      return lenguaje.nombre.toLowerCase() === nombreNormalizado;
    });

    // Si no existe o ya se intento, mostramos error.
    if (!lenguajeSeleccionado) {
      setMensajeError("Selecciona un lenguaje valido de la lista.");
      return;
    }

    setMensajeError("");
    // Comparamos con el objetivo y obtenemos los estados de cada atributo.
    const resultado = construirResultadoIntento(lenguajeSeleccionado, lenguajeObjetivo);

    // Guardamos el intento nuevo al principio de la lista para que aparezca primero.
    setIntentos(function (anterior) {
      return [resultado, ...anterior];
    });

    // Quitamos el lenguaje de la lista disponible para que no vuelva a aparecer en sugerencias.
    setLenguajesDisponibles(function (anterior) {
      return anterior.filter(function (lenguaje) {
        return lenguaje.id !== lenguajeSeleccionado.id;
      });
    });

    setTextoBusqueda("");

    // Si el ID coincide con el objetivo, el usuario ha ganado la partida.
    if (lenguajeSeleccionado.id === lenguajeObjetivo.id) {
      setMensajeAcierto("¡Has acertado el lenguaje!");
    }
  }

  // Maneja cuando el usuario presiona Enter o hace click en el boton de enviar.
  function enviarFormulario(evento) {
    evento.preventDefault();

    if (lenguajesDisponibles.length === 0) {
      setMensajeError("No hay lenguajes cargados todavia.");
      return;
    }

    const textoNormalizado = textoBusqueda.trim().toLowerCase();
    const coincidenciaExacta = lenguajesDisponibles.find(function (lenguaje) {
      return lenguaje.nombre.toLowerCase() === textoNormalizado;
    });

    // Si escribio exactamente el nombre de un lenguaje disponible, lo enviamos.
    if (coincidenciaExacta) {
      enviarIntento(coincidenciaExacta.nombre);
      return;
    }

    // Si hay sugerencias, tomamos la primera y la enviamos.
    if (sugerencias.length > 0) {
      enviarIntento(sugerencias[0].nombre);
      return;
    }

    setMensajeError("No hay coincidencias para ese lenguaje.");
  }

  // Solo mostramos el desplegable de sugerencias si hay texto escrito y tenemos coincidencias.
  let haySugerencias = false;
  if (textoBusqueda.trim() && sugerencias.length > 0 && !mensajeAcierto) {
    haySugerencias = true;
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

          {haySugerencias ? (
          <ul
            className="classic-suggestion-list"
            role="listbox"
            aria-label="Sugerencias de lenguajes"
          >
            {sugerencias.map(function (lenguaje) {
              return (
                <li key={lenguaje.id}>
                  <button
                    type="button"
                    className="classic-suggestion-item"
                    onClick={function () {
                      // Al hacer click en una sugerencia enviamos ese intento directamente.
                      enviarIntento(lenguaje.nombre);
                    }}
                  >
                    <span className="classic-avatar">{sacarIniciales(lenguaje.nombre)}</span>
                    <span>{lenguaje.nombre}</span>
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
              <div key={intento.lenguaje.id} className="classic-results-row">
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
