import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	crearPartidaLogo,
	obtenerPartidaActivaPorModo,
	obtenerPartidaLogo,
	obtenerLenguajesActivos,
	enviarIntentoLogo,
} from "../api/api";
import { obtenerClavePartidaModo, obtenerTokenValido } from "../src/utils/session";
import SelectorModos from "../src/components/juego/SelectorModos";
import "./Clasico.css";
import "./Logo.css";

const ZOOM_INICIAL_LOGO = 2.5;

// Busca coincidencia exacta de nombre dentro de una lista de lenguajes.
function buscarLenguajeExacto(lista, texto) {
	return lista.find(function (lenguaje) {
		return lenguaje.nombre.toLowerCase() === texto.toLowerCase();
	});
}

// Convierte la respuesta del backend a un formato simple para mostrar historial.
function normalizarIntentoLogo(intento, indice) {
	const lenguajeIntentado = intento.lenguaje ?? intento.lenguaje_intentado ?? null;

	return {
		numeroIntento: intento.numeroIntento ?? intento.numero_intento ?? indice + 1,
		correcto: Boolean(intento.correcto ?? intento.resultado?.correcto),
		lenguaje: lenguajeIntentado,
		nombreMostrado: lenguajeIntentado?.nombre ?? "Sin lenguaje",
	};
}

export default function Logo() {
	const navegar = useNavigate();

	// --- Estados de la interfaz visual ---
	// Almacena el texto que escribe el usuario en el buscador.
	const [textoBusqueda, setTextoBusqueda] = useState("");
	// Catálogo completo de lenguajes activos que devuelve el backend.
	const [catalogoLenguajes, setCatalogoLenguajes] = useState([]);
	// Historial de intentos del usuario durante la partida actual.
	const [intentos, setIntentos] = useState([]);
	// Mensaje de error si algo sale mal.
	const [mensajeError, setMensajeError] = useState("");
	// Mensaje de acierto cuando el usuario adivina correctamente.
	const [mensajeAcierto, setMensajeAcierto] = useState("");
	// Token JWT del usuario autenticado.
	const [token, setToken] = useState("");
	// ID de la partida actual de modo logo.
	const [partidaId, setPartidaId] = useState(null);
	// Indicador de carga durante la inicialización de partida.
	const [cargando, setCargando] = useState(true);
	// Evita dobles envíos mientras se procesa un intento.
	const [enviandoIntento, setEnviandoIntento] = useState(false);
	// URL del logo objetivo que se muestra en el panel central.
	const [urlLogo, setUrlLogo] = useState(null);
	// Nivel de zoom aplicado al logo para aumentar la dificultad al principio.
	const [zoom, setZoom] = useState(ZOOM_INICIAL_LOGO);

	// Lista derivada de lenguajes que aún no se han intentado.
	const lenguajesDisponibles = useMemo(
		function () {
			const idsIntentados = new Set(
				intentos
					.map(function (intento) {
						return intento.lenguaje?.id;
					})
					.filter(Boolean),
			);

			return catalogoLenguajes.filter(function (lenguaje) {
				return !idsIntentados.has(lenguaje.id);
			});
		},
		[catalogoLenguajes, intentos],
	);

	// useEffect para inicializar la partida desde backend.
	// Si hay una partida guardada se intenta reanudar; si no, se crea una nueva.
	useEffect(
		function () {
			async function inicializarPartida() {
				try {
					const tokenGuardado = obtenerTokenValido();
					if (!tokenGuardado) {
						setMensajeError("No estas autenticado. Redirigiendo a login...");
						setTimeout(function () {
							navegar("/login");
						}, 1200);
						setCargando(false);
						return;
					}

					setToken(tokenGuardado);
					const partidaStorageKey = obtenerClavePartidaModo("logo", tokenGuardado);
					// Cargar catálogo para sugerencias/autocompletado.

					const lenguajesActivos = await obtenerLenguajesActivos();
					setCatalogoLenguajes(lenguajesActivos);
					
					// Se pregunta primero al backend por una partida activa para que la
					// reanudacion funcione tambien desde otros navegadores.
					const partidaActivaResumen = await obtenerPartidaActivaPorModo("logo", tokenGuardado);
					const partidaGuardada = partidaStorageKey
						? localStorage.getItem(partidaStorageKey)
						: null;
					let partidaActiva = null;

					if (partidaActivaResumen?.id) {
						partidaActiva = await obtenerPartidaLogo(partidaActivaResumen.id, tokenGuardado);
						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(partidaActivaResumen.id));
						}
					} else if (partidaGuardada) {
						try {
							partidaActiva = await obtenerPartidaLogo(partidaGuardada, tokenGuardado);
						} catch {
							if (partidaStorageKey) {
								localStorage.removeItem(partidaStorageKey);
							}
						}
					}

					if (!partidaActiva) {
						const respuestaPartida = await crearPartidaLogo(tokenGuardado);
						const nuevaPartidaId = respuestaPartida.partida_id;

						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(nuevaPartidaId));
						}

						setPartidaId(nuevaPartidaId);
						setUrlLogo(respuestaPartida.logoUrl ?? null);
						setIntentos([]);
						setMensajeAcierto("");
						setZoom(ZOOM_INICIAL_LOGO);
						setCargando(false);
						return;
					}

					// Si hay partida previa, restauramos ID e historial.
					setPartidaId(partidaActiva.partida?.id ?? null);
					setUrlLogo(partidaActiva.logoUrl ?? null);
					setIntentos((partidaActiva.intentos ?? []).map(normalizarIntentoLogo));

					if (partidaActiva.partida?.estado === "ganada") {
						setMensajeAcierto("Has acertado el lenguaje.");
						if (partidaStorageKey) {
							localStorage.removeItem(partidaStorageKey);
						}
						setZoom(1);
					} else {
						setZoom(ZOOM_INICIAL_LOGO);
					}

					setCargando(false);
				} catch (error) {
					console.error("Error al inicializar partida de logo:", error);
					setMensajeError(error.message || "Error al cargar la partida de logo. Intenta de nuevo.");
					setCargando(false);
				}
			}

			inicializarPartida();
		},
		[navegar],
	);

	// Ajusta el zoom del logo según los intentos realizados.
	// A más intentos, menos zoom y más fácil resulta identificar el logo.
	useEffect(
		function () {
			if (mensajeAcierto) {
				setZoom(1);
				return;
			}

			const siguienteZoom = intentos.length < 5 ? ZOOM_INICIAL_LOGO - 0.2 * intentos.length : 1;
			setZoom(siguienteZoom);
		},
		[intentos.length, mensajeAcierto],
	);

	// Calcula las sugerencias mientras el usuario escribe en el buscador.
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

	// Envía un intento de adivinanza al backend del modo logo.
	async function procesarIntento(respuesta) {
		if (mensajeAcierto || enviandoIntento) {
			return;
		}

		if (!token || !partidaId) {
			setMensajeError("Error en la carga de la partida. Recarga la pagina.");
			return;
		}

		const respuestaNormalizada = respuesta.trim();
		if (!respuestaNormalizada) {
			return;
		}

		setMensajeError("");
		setEnviandoIntento(true);

		try {
			const resultadoServidor = await enviarIntentoLogo(partidaId, respuestaNormalizada, token);
			const intentoData = normalizarIntentoLogo(resultadoServidor, 0);

			// Actualizamos el historial de intentos con el nuevo intento recibido del backend.
			// Si ya existe un intento con el mismo numeroIntento, no lo añadimos.
			setIntentos(function (anterior) {
				const yaExiste = anterior.some(function (intento) {
					return intento.numeroIntento === intentoData.numeroIntento;
				});

				if (yaExiste) {
					return anterior;
				}

				return [intentoData, ...anterior];
			});

			setTextoBusqueda("");

			if (resultadoServidor.correcto) {
				setMensajeAcierto("Has acertado el lenguaje.");
				const partidaStorageKey = obtenerClavePartidaModo("logo", token);
				if (partidaStorageKey) {
					localStorage.removeItem(partidaStorageKey);
				}
			}
		} catch (error) {
			console.error("Error al enviar intento en modo logo:", error);
			setMensajeError(error.message || "Error al procesar el intento. Intenta de nuevo.");
		} finally {
			setEnviandoIntento(false);
		}
	}

	// Resuelve qué lenguaje se envía según la entrada del usuario y sugerencias.
	function resolverIntentoDesdeEntrada() {
		const textoNormalizado = textoBusqueda.trim();
		if (!textoNormalizado) {
			return null;
		}

		const intentoYaHecho = buscarLenguajeExacto(
			intentos
				.map(function (intento) {
					return intento.lenguaje;
				})
				.filter(Boolean),
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

	// Maneja el submit del formulario principal del modo logo.
	function enviarFormulario(evento) {
		evento.preventDefault();

		if (catalogoLenguajes.length === 0) {
			setMensajeError("No hay lenguajes cargados todavia.");
			return;
		}

		const lenguajeSeleccionado = resolverIntentoDesdeEntrada();
		if (!lenguajeSeleccionado) {
			return;
		}

		procesarIntento(lenguajeSeleccionado);
	}

	const haySugerencias = textoBusqueda.trim() && sugerencias.length > 0 && !mensajeAcierto;

	if (cargando) {
		return (
			<section className="classic-page">
				<p className="classic-loading-state">Cargando partida...</p>
			</section>
		);
	}

	if (!partidaId) {
		return (
			<section className="classic-page">
				<p className="classic-error-state">
					{mensajeError || "Error al cargar la partida de logo"}
				</p>
			</section>
		);
	}

	return (
		<section className="classic-page">
			{/* Selector de modos (Clasico / Logo / Codigo) */}
			<SelectorModos modoActivo="logo" onNavegar={navegar} />

			{/* Caja de introducción y título */}
			<article className="classic-intro-box">
				<h1>Adivina el lenguaje</h1>
			</article>

			{/* Imagen con el logo a buscar y con función de zoom */}
			<div className="zoom-container">
				{urlLogo ? (
					<img
						src={urlLogo}
						alt="Logo del lenguaje a adivinar"
						className="zoom-image"
						style={{ transform: `scale(${zoom})` }}
					/>
				) : (
					<div className="logo-placeholder">Cargando logo...</div>
				)}
			</div>

			{/* Buscador: input, botón y lista de sugerencias */}
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
										<span>{lenguaje.nombre}</span>
									</button>
								</li>
							);
						})}
					</ul>
				) : null}
			</form>

			{/* Mensajes de estado */}
			{mensajeError ? <p className="classic-error">{mensajeError}</p> : null}
			{mensajeAcierto ? <p className="classic-success">{mensajeAcierto}</p> : null}

			{/* Historial básico de intentos */}
			<section className="classic-results logo-results" aria-label="Historial de intentos">
				{intentos.length === 0 ? (
					<p className="classic-empty">Todavia no hay intentos.</p>
				) : (
					intentos.map(function (intento) {
						return (
							<div
								key={intento.numeroIntento ?? intento.lenguaje?.id}
								className={`classic-cell logo-intento-item ${intento.correcto ? "classic-correcto" : "classic-incorrecto"}`}
							>
								<span>{intento.nombreMostrado}</span>
							</div>
						);
					})
				)}
			</section>
		</section>
	);
}
