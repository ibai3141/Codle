import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cambiarContrasenaRecuperacion } from "../api/api";
import "./Login.css";

// Lee el token temporal de recuperacion que Supabase anade al hash de la URL
// despues de que el usuario pulse el enlace recibido por correo.
function obtenerAccessTokenDeRecuperacion() {
	const hash = window.location.hash.startsWith("#")
		? window.location.hash.slice(1)
		: window.location.hash;
	const parametrosHash = new URLSearchParams(hash);
	const tokenHash = parametrosHash.get("access_token");
	if (tokenHash) {
		return tokenHash;
	}

	// Respaldo por si algun flujo de Supabase o del navegador entrega el token
	// en la query string en lugar del hash.
	const parametrosQuery = new URLSearchParams(window.location.search);
	return parametrosQuery.get("access_token");
}

// Pantalla final del flujo de recuperacion donde el usuario define
// la nueva contrasena que se guardara en la aplicacion.
export default function ResetContrasenia() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	const accessToken = useMemo(() => obtenerAccessTokenDeRecuperacion(), []);

	const handleSubmit = async (evento) => {
		evento.preventDefault();
		setError("");
		setSuccess("");

		if (!accessToken) {
			setError("El enlace no es valido o ha expirado.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Las contrasenas no coinciden.");
			return;
		}

		setLoading(true);

		try {
			const data = await cambiarContrasenaRecuperacion(accessToken, password);
			setSuccess(data.message || "Contrasena actualizada correctamente.");

			// Limpiamos el hash para no dejar expuesto en la URL el token
			// temporal que venia en el enlace de recuperacion.
			window.history.replaceState(null, "", "/reset-contrasenia");

			setTimeout(() => {
				navigate("/login");
			}, 1200);
		} catch (err) {
			setError(err.message || "No se pudo actualizar la contrasena.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="login-page">
			<h1>Nueva contrasena</h1>

			<form onSubmit={handleSubmit}>
				<label htmlFor="password">Nueva contrasena</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					autoComplete="new-password"
					className="login-input"
				/>

				<label htmlFor="confirm-password">Repetir contrasena</label>
				<input
					id="confirm-password"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
					autoComplete="new-password"
					className="login-input"
				/>

				<button type="submit" disabled={loading}>
					{loading ? "Guardando..." : "Guardar contrasena"}
				</button>
			</form>

			<p className="login-back">
				<Link to="/login">
					<button type="button">Volver a login</button>
				</Link>
			</p>

			{error ? <p className="login-error">{error}</p> : null}
			{success ? <p className="login-success">{success}</p> : null}
		</section>
	);
}
