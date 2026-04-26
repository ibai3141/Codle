import { MODOS_JUEGO } from "./modosJuego";

// Componente para mostrar el selector de modos de juego en la barra superior.
export default function SelectorModos(props) {
	const modoActivo = props.modoActivo;
	const onNavegar = props.onNavegar;

	return (
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
	);
}
