import { sacarIniciales } from "../../utils/lenguajes";

// Componente para mostrar el logo de un lenguaje de manera correcta
export default function LogoLenguaje(props) {
	const lenguaje = props.lenguaje;
	const className = props.className;
	const decorativo = Boolean(props.decorativo);

	if (lenguaje.logoUrl) {
		return (
			<img
				src={lenguaje.logoUrl}
				alt={decorativo ? "" : `Logo de ${lenguaje.nombre}`}
				className={className || "classic-logo-imagen"}
			/>
		);
	}

	return (
		<div className={className || "classic-logo-relleno"} aria-hidden={decorativo}>
			{sacarIniciales(lenguaje.nombre)}
		</div>
	);
}
