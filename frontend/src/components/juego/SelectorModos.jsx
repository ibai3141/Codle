import { MODOS_JUEGO } from "./modosJuego";

// Componente para mostrar el selector de modos de juego en la barra superior.
export default function SelectorModos(props) {
	const modoActivo = props.modoActivo;
	const onNavegar = props.onNavegar;

	return (
		<div className="classic-topbar">
			{/* Boton comun para volver al home desde cualquier modo sin duplicar codigo */}
			<button
				type="button"
				className="classic-home-button"
				onClick={function () {
					onNavegar("/home");
				}}
				aria-label="Volver al inicio"
				title="Volver al inicio"
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					className="classic-home-button-icon"
				>
					<path
						d="M4 10.5 12 4l8 6.5v8a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"
						fill="currentColor"
					/>
				</svg>
			</button>

			<div className="classic-mode-strip" aria-label="Selector de modos">
				{MODOS_JUEGO.map(function (modo) {
					const estaActivo = modo.clave === modoActivo;
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
								onNavegar(modo.ruta);
							}}
							aria-current={estaActivo ? "page" : undefined}
						>
							<span className="classic-mode-icon">{modo.icono}</span>
							<span>{modo.etiqueta}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
