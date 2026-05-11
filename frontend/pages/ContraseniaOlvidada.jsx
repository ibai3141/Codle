import { useState } from "react";
import { Link } from "react-router-dom";
import { solicitarRecuperacionContrasena } from "../api/api";
import "./Login.css";

// Pantalla donde el usuario escribe su email para recibir el enlace
// de recuperacion de contrasena.
export default function ContraseniaOlvidada() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (evento) => {
		evento.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		try {
			// Indicamos a Supabase que, al pulsar el correo, el usuario vuelva
			// a la ruta donde le pediremos la nueva contrasena.
			const redirectTo = `${window.location.origin}/reset-contrasenia`;
			const data = await solicitarRecuperacionContrasena(email, redirectTo);
			setSuccess(data.message || "Revisa tu correo para cambiar la contrasena.");
		} catch (err) {
			setError(err.message || "No se pudo enviar el correo de recuperacion.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="login-page">
			<h1>Recuperar contrasena</h1>

			<form onSubmit={handleSubmit}>
				<label htmlFor="recovery-email">Email</label>
				<input
					id="recovery-email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					autoComplete="email"
					className="login-input"
				/>

				<button type="submit" disabled={loading}>
					{loading ? "Enviando..." : "Enviar enlace"}
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
