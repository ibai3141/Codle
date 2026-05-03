import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	crearPartidaCodigo,
	enviarIntentoCodigo,
	obtenerPartidaActivaPorModo,
	obtenerPartidaCodigo,
} from "../api/api";
import SelectorModos from "../src/components/juego/SelectorModos";
import { obtenerClavePartidaModo, obtenerTokenValido } from "../src/utils/session";
import "./Clasico.css";
import "./Codigo.css";

const MAX_INTENTOS_CODIGO = 10;

function normalizarIntentoCodigo(intento, indice) {
	return {
		numeroIntento: intento.numeroIntento ?? intento.numero_intento ?? indice + 1,
		respuestaUsuario: intento.respuestaUsuario ?? intento.respuesta_usuario ?? "",
		respuestaNormalizada:
			intento.respuestaNormalizada ?? intento.respuesta_normalizada ?? "",
		correcto: Boolean(intento.correcto ?? intento.es_correcto),
		creadoEn: intento.creadoEn ?? intento.creado_en ?? null,
	};
}

function construirMensajeEstado(estadoPartida) {
	if (estadoPartida === "ganada") {
		return "Has acertado la salida del fragmento.";
	}

	if (estadoPartida === "perdida") {
		return "Has agotado los intentos disponibles.";
	}

	return "";
}

export default function Codigo() {
	const navegar = useNavigate();

	const [respuestaUsuario, setRespuestaUsuario] = useState("");
	const [token, setToken] = useState("");
	const [partidaId, setPartidaId] = useState(null);
	const [reto, setReto] = useState(null);
	const [intentos, setIntentos] = useState([]);
	const [partidaInfo, setPartidaInfo] = useState(null);
	const [mensajeError, setMensajeError] = useState("");
	const [mensajeEstado, setMensajeEstado] = useState("");
	const [salidaCorrecta, setSalidaCorrecta] = useState("");
	const [cargando, setCargando] = useState(true);
	const [enviandoIntento, setEnviandoIntento] = useState(false);

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
					const partidaStorageKey = obtenerClavePartidaModo("codigo", tokenGuardado);
					const partidaGuardada = partidaStorageKey
						? localStorage.getItem(partidaStorageKey)
						: null;

					const partidaActivaResumen = await obtenerPartidaActivaPorModo(
						"codigo",
						tokenGuardado,
					);

					let partidaActiva = null;

					if (partidaActivaResumen?.id) {
						partidaActiva = await obtenerPartidaCodigo(
							partidaActivaResumen.id,
							tokenGuardado,
						);
						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(partidaActivaResumen.id));
						}
					} else if (partidaGuardada) {
						try {
							partidaActiva = await obtenerPartidaCodigo(partidaGuardada, tokenGuardado);
						} catch {
							if (partidaStorageKey) {
								localStorage.removeItem(partidaStorageKey);
							}
						}
					}

					if (!partidaActiva) {
						const nuevaPartida = await crearPartidaCodigo(tokenGuardado);
						if (partidaStorageKey) {
							localStorage.setItem(partidaStorageKey, String(nuevaPartida.partida_id));
						}

						setPartidaId(nuevaPartida.partida_id);
						setReto(nuevaPartida.reto);
						setPartidaInfo({
							estado: nuevaPartida.estado,
							max_intentos: nuevaPartida.max_intentos,
							intentos_usados: nuevaPartida.intentos_usados,
						});
						setIntentos([]);
						setMensajeEstado("");
						setSalidaCorrecta("");
						setCargando(false);
						return;
					}

					setPartidaId(partidaActiva.partida?.id ?? null);
					setReto(partidaActiva.reto ?? null);
					setIntentos((partidaActiva.intentos ?? []).map(normalizarIntentoCodigo));
					setPartidaInfo(partidaActiva.partida ?? null);
					setMensajeEstado(construirMensajeEstado(partidaActiva.partida?.estado));

					if (partidaActiva.partida?.estado !== "en_curso" && partidaStorageKey) {
						localStorage.removeItem(partidaStorageKey);
					}

					setCargando(false);
				} catch (error) {
					console.error("Error al inicializar partida de codigo:", error);
					setMensajeError(error.message || "Error al cargar la partida de codigo.");
					setCargando(false);
				}
			}

			inicializarPartida();
		},
		[navegar],
	);

	const partidaTerminada = partidaInfo?.estado && partidaInfo.estado !== "en_curso";
	const intentosUsados = partidaInfo?.intentos_usados ?? 0;
	const maxIntentos = partidaInfo?.max_intentos ?? MAX_INTENTOS_CODIGO;
	const intentosRestantes = Math.max(maxIntentos - intentosUsados, 0);

	async function enviarRespuesta(evento) {
		evento.preventDefault();

		if (partidaTerminada || enviandoIntento) {
			return;
		}

		if (!token || !partidaId) {
			setMensajeError("Error en la carga de la partida. Recarga la pagina.");
			return;
		}

		if (!respuestaUsuario.trim()) {
			setMensajeError("Escribe una salida antes de enviar el intento.");
			return;
		}

		setMensajeError("");
		setMensajeEstado("");
		setEnviandoIntento(true);

		try {
			const resultadoServidor = await enviarIntentoCodigo(
				partidaId,
				respuestaUsuario,
				token,
			);

			const nuevoIntento = normalizarIntentoCodigo(
				resultadoServidor.intento ?? {
					numero_intento: resultadoServidor.numero_intento,
					respuesta_usuario: resultadoServidor.respuesta_usuario,
					respuesta_normalizada: resultadoServidor.respuesta_normalizada,
					es_correcto: resultadoServidor.correcto,
				},
				0,
			);

			setIntentos(function (anterior) {
				const yaExiste = anterior.some(function (intento) {
					return intento.numeroIntento === nuevoIntento.numeroIntento;
				});

				if (yaExiste) {
					return anterior;
				}

				return [nuevoIntento, ...anterior];
			});

			setPartidaInfo(function (anterior) {
				return {
					...(anterior ?? {}),
					estado: resultadoServidor.estado_partida,
					intentos_usados: resultadoServidor.intentos_usados,
					max_intentos: anterior?.max_intentos ?? maxIntentos,
				};
			});

			setRespuestaUsuario("");
			setMensajeEstado(construirMensajeEstado(resultadoServidor.estado_partida));

			if (resultadoServidor.salida_esperada) {
				setSalidaCorrecta(resultadoServidor.salida_esperada);
			}

			if (resultadoServidor.estado_partida !== "en_curso") {
				const partidaStorageKey = obtenerClavePartidaModo("codigo", token);
				if (partidaStorageKey) {
					localStorage.removeItem(partidaStorageKey);
				}
			}
		} catch (error) {
			console.error("Error al enviar intento en modo codigo:", error);
			setMensajeError(error.message || "Error al procesar la respuesta.");
		} finally {
			setEnviandoIntento(false);
		}
	}

	if (cargando) {
		return (
			<section className="classic-page">
				<p className="classic-loading-state">Cargando partida...</p>
			</section>
		);
	}

	if (!partidaId || !reto) {
		return (
			<section className="classic-page">
				<p className="classic-error-state">
					{mensajeError || "Error al cargar la partida de codigo"}
				</p>
			</section>
		);
	}

	return (
		<section className="classic-page">
			<SelectorModos modoActivo="codigo" onNavegar={navegar} />

			<article className="classic-intro-box">
				<h1>{reto.titulo || "Reto de codigo"}</h1>
			</article>

			<section className="codigo-reto-card" aria-label="Fragmento de codigo">
				<pre className="codigo-snippet">
					<code>{reto.snippet}</code>
				</pre>
			</section>

			<form className="codigo-answer-form" onSubmit={enviarRespuesta}>
				<div className="codigo-answer-head">
					<label className="codigo-answer-label" htmlFor="codigo-respuesta">
						Salida esperada
					</label>
					<span className="codigo-answer-meta">
						Intentos restantes: {intentosRestantes}
					</span>
				</div>
				<div className="codigo-answer-shell">
					<textarea
						id="codigo-respuesta"
						className="codigo-answer-input"
						value={respuestaUsuario}
						onChange={function (evento) {
							setRespuestaUsuario(evento.target.value);
							if (mensajeError) {
								setMensajeError("");
							}
						}}
						placeholder="Escribe exactamente lo que devolveria el fragmento"
						disabled={partidaTerminada || enviandoIntento}
						rows={5}
					/>
					<button
						type="submit"
						className="codigo-submit-arrow"
						disabled={partidaTerminada || enviandoIntento}
						aria-label={enviandoIntento ? "Comprobando respuesta" : "Enviar respuesta"}
					>
						{enviandoIntento ? "…" : "▶"}
					</button>
				</div>
			</form>

			{mensajeError ? <p className="classic-error">{mensajeError}</p> : null}
			{mensajeEstado ? <p className="classic-success">{mensajeEstado}</p> : null}

			{salidaCorrecta && partidaInfo?.estado === "perdida" ? (
				<section className="codigo-solution-card" aria-label="Salida correcta">
					<p className="codigo-eyebrow">Salida correcta</p>
					<pre className="codigo-solution-output">{salidaCorrecta}</pre>
				</section>
			) : null}

			{partidaTerminada && reto?.explicacion ? (
				<section className="codigo-explicacion-card" aria-label="Explicacion del reto">
					<p className="codigo-eyebrow">Explicacion</p>
					<p className="codigo-explicacion-texto">{reto.explicacion}</p>
				</section>
			) : null}

			<section className="classic-results codigo-results" aria-label="Historial de intentos">
				<header className="codigo-results-header">
					<span>Intento</span>
					<span>Respuesta enviada</span>
					<span>Estado</span>
				</header>

				{intentos.length === 0 ? (
					<p className="classic-empty">Todavia no hay intentos.</p>
				) : (
					intentos.map(function (intento) {
						return (
							<div key={intento.numeroIntento} className="codigo-results-row">
								<div className="classic-cell codigo-intento-numero">
									<span>{intento.numeroIntento}</span>
								</div>
								<div className="classic-cell codigo-intento-respuesta">
									<pre>{intento.respuestaUsuario || "(vacia)"}</pre>
								</div>
								<div
									className={`classic-cell ${
										intento.correcto ? "classic-correcto" : "classic-incorrecto"
									}`}
								>
									<span>{intento.correcto ? "Correcto" : "Incorrecto"}</span>
								</div>
							</div>
						);
					})
				)}
			</section>
		</section>
	);
}
