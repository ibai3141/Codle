import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi, reenviarVerificacion } from "../api/api";
import "./Register.css";

export default function Register() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState("");
	const [pendienteVerificacion, setPendienteVerificacion] = useState(false);
	const [reenviando, setReenviando] = useState(false);

	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		try {
			// Registramos la cuenta y, si todo va bien, dejamos al usuario
			// en espera de verificar su correo antes de iniciar sesion.
			await registerApi({ email, password });
			setPendienteVerificacion(true);
			setSuccess(
				"Cuenta creada correctamente. Revisa tu correo y confirma el registro antes de iniciar sesion.",
			);
		} catch (err) {
			setError(err.message || "Error al crear la cuenta.");
		} finally {
			setLoading(false);
		}
	};

	const manejarReenvio = async () => {
		if (!email || reenviando) {
			return;
		}

		// Permite volver a solicitar el correo de verificacion sin tener
		// que rehacer el registro desde cero.
		setError("");
		setSuccess("");
		setReenviando(true);

		try {
			await reenviarVerificacion(email);
			setSuccess("Te hemos reenviado el correo de verificacion.");
		} catch (err) {
			setError(err.message || "No se pudo reenviar el correo de verificacion.");
		} finally {
			setReenviando(false);
		}
	};

	return (
		<section className="register-page">
			<h1>Registro</h1>

			{!pendienteVerificacion ? (
				<>
					<form onSubmit={handleSubmit}>
						<label htmlFor="email">Email</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
							className="register-input"
						/>

						<label htmlFor="password">Contrasena</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							autoComplete="new-password"
							className="register-input"
						/>

						<button type="submit" disabled={loading}>
							{loading ? "Creando..." : "Crear cuenta"}
						</button>
					</form>

					<p className="register-login-link">
						Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link>
					</p>
					<p className="register-back">
						<Link to="/">
							<button type="button">Volver al inicio</button>
						</Link>
					</p>
				</>
			) : (
				<div className="register-verification-box">
					<p className="register-verification-text">
						Te hemos enviado un enlace de verificacion a <strong>{email}</strong>.
						Cuando confirmes el correo, ya podras iniciar sesion.
					</p>

					<div className="register-verification-actions">
						<button type="button" onClick={manejarReenvio} disabled={reenviando}>
							{reenviando ? "Reenviando..." : "Reenviar correo"}
						</button>
						<button type="button" className="register-secondary-btn" onClick={() => navigate("/login")}>
							Ir a login
						</button>
					</div>
				</div>
			)}

			{error ? <p className="register-error">{error}</p> : null}
			{success ? <p className="register-success">{success}</p> : null}
		</section>
	);
}
