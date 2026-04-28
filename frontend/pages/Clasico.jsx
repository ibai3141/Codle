import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	crearPartida,
	obtenerPartidaActivaPorModo,
	obtenerPartida,
	obtenerLenguajesActivos,
	enviarIntento as enviarIntentoApi,
} from "../api/api";
import { obtenerClavePartidaModo, obtenerTokenValido } from "../src/utils/session";
import LogoLenguaje from "../src/components/lenguajes/LogoLenguaje";
import SelectorModos from "../src/components/juego/SelectorModos";
import "./Clasico.css";

// Clave de localStorage usada para recordar la partida en curso del modo clásico.
// Así si el usuario recarga la página podemos recuperar la sesión y el historial.

// Componente que renderiza una celda de estado. Muestra el contenido con el color correspondiente.
// Si es "alto" o "bajo" (para el año) muestra una flecha arriba o abajo.
function CeldaEstado(props) {
	const estado = props.estado;
	let flecha = "";

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

// Componente especial para mostrar el lenguaje en la tabla de resultados.
// Enseña el logo y el nombre juntos para que el feedback sea más claro visualmente.
function CeldaLenguaje(props) {
	const lenguaje = props.lenguaje;

	return (
		<div className={`classic-cell classic-${props.estado}`}>
			<div className="classic-language-chip">
				<LogoLenguaje lenguaje={lenguaje} className="classic-logo-imagen" />
				<span className="classic-language-name">{lenguaje.nombre}</span>
			</div>
		</div>
	);
}

function buscarLenguajeExacto(lista, texto) {
	return lista.find(function (lenguaje) {
		return lenguaje.nombre.toLowerCase() === texto.toLowerCase();
	});
}

export default function Clasico() {
	const navegar = useNavigate();

	// --- Estados de la interfaz visual ---
	// Almacena el texto que escribe el usuario en el buscador.
	const [textoBusqueda, setTextoBusqueda] = useState("");
	// Catálogo completo de lenguajes activos que devuelve el backend.
	const [catalogoLenguajes, setCatalogoLenguajes] = useState([]);
	// Historial de todos los intentos que hace el usuario. Se muestra en la tabla de abajo.
	const [intentos, setIntentos] = useState([]);
	// Mensaje de error si algo sale mal (lenguaje no válido, fallo de red, etc).
	const [mensajeError, setMensajeError] = useState("");
	// Mensaje de acierto cuando el usuario adivina correctamente el lenguaje.
	const [mensajeAcierto, setMensajeAcierto] = useState("");
	// Token JWT del usuario autenticado. Se obtiene de localStorage.
	const [token, setToken] = useState("");
	// ID de la partida actual en backend. Identifica la sesión de juego.
	const [partidaId, setPartidaId] = useState(null);
	// Indicador de carga mientras se inicializa la partida desde backend.
	const [cargando, setCargando] = useState(true);
	// Evita dobles clics o dobles Enter mientras el intento se está enviando.
	const [enviandoIntento, setEnviandoIntento] = useState(false);

	// Lista derivada de lenguajes que aún no se han intentado.
	// Se calcula restando del catálogo completo los IDs que ya aparecen en el historial.
	const lenguajesDisponibles = useMemo(
		function () {
			const idsIntentados = new Set(
				intentos.map(function (intento) {
					return intento.lenguaje.id;
				}),
			);

			return catalogoLenguajes.filter(function (lenguaje) {
				return !idsIntentados.has(lenguaje.id);
			});
		},
		[catalogoLenguajes, intentos],
	);

	// useEffect para inicializar la partida desde backend.
	// Si existe una partida guardada en localStorage se intenta reanudar.
	// Si no existe o ya no es válida, se crea una nueva.
	useEffect(
		function () {
			async function inicializarPartida() {
				try {
					const tokenGuardado = obtenerTokenValido();
					if (!tokenGuardado) {
						setMensajeError("No estás autenticado. Redirigiendo a login...");
						setTimeout(function () {
							navegar("/login");
						}, 1200);
						setCargando(false);
						return;
					}

					setToken(tokenGuardado);
					const partidaStorageKey = obtenerClavePartidaModo("clasico", tokenGuardado);

					// Cargar el catálogo de lenguajes activos. Se usa para sugerencias y validación visual.
					const lenguajesActivos = await obtenerLenguajesActivos();
					setCatalogoLenguajes(lenguajesActivos);

					// Primero se consulta al backend por si ese usuario ya tiene una partida
					// activa en curso, incluso aunque venga de otro navegador o dispositivo.
					const partidaActivaResumen = await obtenerPartidaActivaPorModo("clasico", tokenGuardado);
					const partidaGuardada = partidaStorageKey
						? localStorage.getItem(partidaStorageKey)
						: null;
					let partidaActiva = null;

					if (partidaActivaResumen?.id) {
						partidaActiva = await obtenerPartida(partidaActivaResumen.id, tokenGuardado);
						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(partidaActivaResumen.id));
						}
					} else if (partidaGuardada) {
						try {
							partidaActiva = await obtenerPartida(partidaGuardada, tokenGuardado);
						} catch {
							// Si la partida guardada ya no existe o falla, la descartamos y empezamos otra.
							if (partidaStorageKey) {
								localStorage.removeItem(partidaStorageKey);
							}
							partidaActiva = null;
						}
					}

					if (!partidaActiva) {
						// Si no había partida activa, crear una nueva en backend.
						const respuestaPartida = await crearPartida(tokenGuardado);
						const nuevaPartidaId = respuestaPartida.partida_id;
						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(nuevaPartidaId));
						}

						setPartidaId(nuevaPartidaId);
						setIntentos([]);
						setMensajeAcierto("");
						setCargando(false);
						return;
					}

					// Si sí había partida activa, restauramos ID e historial.
					setPartidaId(partidaActiva.partida.id);
					setIntentos(partidaActiva.intentos ?? []);

					// Si el backend ya marca la partida como ganada, mostramos el mensaje y limpiamos storage.
					if (partidaActiva.partida.estado === "ganada") {
						setMensajeAcierto("¡Has acertado el lenguaje!");
						if (partidaStorageKey) {
							localStorage.removeItem(partidaStorageKey);
						}
					}

					setCargando(false);
				} catch (error) {
					console.error("Error al inicializar partida:", error);
					setMensajeError(error.message || "Error al cargar la partida. Intenta de nuevo.");
					setCargando(false);
				}
			}

			inicializarPartida();
		},
		[navegar],
	);

	// Calcula las sugerencias mientras el usuario escribe en el buscador.
	// Solo muestra lenguajes disponibles que empiezan por lo que escribió (máximo 8).
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

	// Maneja cuando se envía un intento.
	// La validación oficial del lenguaje la hace el backend, que además persiste el intento.
	async function procesarIntento(respuesta) {
		// Si ya ha acertado o hay una petición en curso, no permitimos más envíos.
		if (mensajeAcierto || enviandoIntento) {
			return;
		}

		// Comprobamos que tenemos los datos mínimos para seguir.
		if (!token || !partidaId) {
			setMensajeError("Error en la carga de la partida. Recarga la página.");
			return;
		}

		const respuestaNormalizada = respuesta.trim();
		if (!respuestaNormalizada) {
			return;
		}

		setMensajeError("");
		setEnviandoIntento(true);

		try {
			// El backend resuelve alias/nombre, compara con el objetivo y devuelve el feedback oficial.
			const resultadoServidor = await enviarIntentoApi(partidaId, respuestaNormalizada, token);

			// Adaptamos la respuesta del servidor al formato que usa la UI.
			const intentoData = {
				numeroIntento: resultadoServidor.numero_intento,
				lenguaje: resultadoServidor.lenguaje_intentado,
				estados: {
					nombre: resultadoServidor.resultado.correcto ? "correcto" : "incorrecto",
					anioCreacion: resultadoServidor.resultado.feedback.anio_creacion,
					ejecucion: resultadoServidor.resultado.feedback.ejecucion ? "correcto" : "incorrecto",
					paradigma: resultadoServidor.resultado.feedback.paradigma ? "correcto" : "incorrecto",
					tipadoTiempo: resultadoServidor.resultado.feedback.tipado_tiempo
						? "correcto"
						: "incorrecto",
					fortalezaTipado: resultadoServidor.resultado.feedback.fortaleza_tipado
						? "correcto"
						: "incorrecto",
					creadores: resultadoServidor.resultado.feedback.creadores ?? "incorrecto",
				},
			};

			// Agregamos el intento al historial si aún no estaba.
			// Esto evita duplicados si por cualquier motivo llega dos veces la misma respuesta.
			setIntentos(function (anterior) {
				const yaExiste = anterior.some(function (intento) {
					return intento.numeroIntento === intentoData.numeroIntento;
				});

				if (yaExiste) {
					return anterior;
				}

				return [intentoData, ...anterior];
			});

			// Limpiar el buscador para preparar el siguiente intento.
			setTextoBusqueda("");

			// Si el intento es correcto, mostrar mensaje de acierto y cerrar la partida local.
			if (resultadoServidor.resultado.correcto) {
				setMensajeAcierto("¡Has acertado el lenguaje!");
				const partidaStorageKey = obtenerClavePartidaModo("clasico", token);
				if (partidaStorageKey) {
					localStorage.removeItem(partidaStorageKey);
				}
			}
		} catch (error) {
			console.error("Error al enviar intento:", error);
			setMensajeError(error.message || "Error al procesar el intento. Intenta de nuevo.");
		} finally {
			setEnviandoIntento(false);
		}
	}

	// Maneja cuando el usuario presiona Enter o hace click en el botón de enviar.
	// Si coincide exactamente con un nombre visible, usamos ese nombre; si no, mandamos
	// el texto tal cual para que el backend pueda resolver aliases como "js", "py", etc.
	function resolverIntentoDesdeEntrada() {
		const textoNormalizado = textoBusqueda.trim();
		if (!textoNormalizado) {
			return null;
		}

		const intentoYaHecho = buscarLenguajeExacto(
			intentos.map(function (intento) {
				return intento.lenguaje;
			}),
			textoNormalizado,
		);

		if (intentoYaHecho) {
			setMensajeError("Ese lenguaje ya ha sido intentado en esta partida.");
			return null;
		}

		const coincidenciaExactaDisponible = buscarLenguajeExacto(
			lenguajesDisponibles,
			textoNormalizado,
		);
		if (coincidenciaExactaDisponible) {
			return coincidenciaExactaDisponible.nombre;
		}

		if (sugerencias.length >= 1) {
			return sugerencias[0].nombre;
		}

		setMensajeError("Selecciona un lenguaje valido de la lista.");
		return null;
	}

	function enviarFormulario(evento) {
		evento.preventDefault();

		if (catalogoLenguajes.length === 0) {
			setMensajeError("No hay lenguajes cargados todavía.");
			return;
		}

		const lenguajeSeleccionado = resolverIntentoDesdeEntrada();
		if (!lenguajeSeleccionado) {
			return;
		}

		procesarIntento(lenguajeSeleccionado);
	}

	// Solo mostramos el desplegable de sugerencias si hay texto escrito y tenemos coincidencias.
	const haySugerencias = textoBusqueda.trim() && sugerencias.length > 0 && !mensajeAcierto;

	// Estado de carga mientras se inicializa la partida.
	if (cargando) {
		return (
			<section className="classic-page">
				<p className="classic-loading-state">Cargando partida...</p>
			</section>
		);
	}

	// Si no hay partida cargada, mostramos el error general.
	if (!partidaId) {
		return (
			<section className="classic-page">
				<p className="classic-error-state">{mensajeError || "Error al cargar la partida"}</p>
			</section>
		);
	}

	// Sección visual: layout principal de la página.
	// A continuación se renderizan las distintas zonas: selector de modos, introducción,
	// buscador con sugerencias, mensajes de estado, historial de intentos y leyenda.
	return (
		<section className="classic-page">
			{/* Selector de modos (Clasico / Logo / Codigo) */}
			<SelectorModos modoActivo="clasico" onNavegar={navegar} />

			{/* Caja de introducción y título (explica brevemente el juego) */}
			<article className="classic-intro-box">
				<h1>¡Adivina el lenguaje!</h1>
			</article>

			{/* Buscador: input, botón de enviar y lista de sugerencias.
          `disabled` se activa cuando el usuario ya ha acertado o hay envío en curso. */}
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
						placeholder="Escribe el nombre o alias del lenguaje"
						aria-label="Buscar lenguaje"
						autoComplete="off"
						disabled={Boolean(mensajeAcierto) || enviandoIntento}
					/>
					<button
						type="submit"
						className="classic-submit"
						disabled={Boolean(mensajeAcierto) || enviandoIntento}
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
						{sugerencias.map(function (lenguaje) {
							return (
								<li key={lenguaje.id}>
									<button
										type="button"
										className="classic-suggestion-item"
										onClick={function () {
											procesarIntento(lenguaje.nombre);
										}}
									>
										<LogoLenguaje
											lenguaje={lenguaje}
											className="classic-suggestion-logo"
											decorativo
										/>
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

			{/* Estado cuando ya no quedan lenguajes disponibles por intentar. */}
			{lenguajesDisponibles.length === 0 && !mensajeAcierto ? (
				<p className="classic-empty-state-api">Ya no quedan lenguajes disponibles.</p>
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
							<div
								key={intento.numeroIntento ?? intento.lenguaje.id}
								className="classic-results-row"
							>
								<CeldaLenguaje lenguaje={intento.lenguaje} estado={intento.estados.nombre} />
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
