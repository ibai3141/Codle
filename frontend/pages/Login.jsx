import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login as loginApi } from "../api/api";
import { guardarToken } from "../src/utils/session";
import "./Login.css";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [success] = useState("");

	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			// Si el backend devuelve token, lo guardamos para futuras rutas protegidas.
			const data = await loginApi(email, password);
			if (data?.access_token) {
				guardarToken(data.access_token);
			}
			navigate("/home");
		} catch (error) {
			setError(error.message || "No se pudo iniciar sesion.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="login-page">
			<h1>Iniciar sesion</h1>

			<form onSubmit={handleSubmit}>
				<label htmlFor="email">Email</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					autoComplete="email"
					className="login-input"
				/>

				<label htmlFor="password">Contrasena</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					autoComplete="current-password"
					className="login-input"
				/>

				<button type="submit" disabled={loading}>
					{loading ? "Entrando..." : "Entrar"}
				</button>
			</form>

			<p className="login-back">
				<Link to="/">
					<button type="button">Volver al inicio</button>
				</Link>
			</p>

			{error ? <p className="login-error">{error}</p> : null}
			{success ? <p className="login-success">{success}</p> : null}
		</section>
	);
}
