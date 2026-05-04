import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Clasico from "../pages/Clasico";
import Logo from "../pages/Logo";
import Codigo from "../pages/Codigo";
import CodeBackdrop from "./components/CodeBackdrop";
import { guardarToken, tieneSesionActiva } from "./utils/session";
import "./AppPage.css";
import { loginConGoogle } from "../api/api";


const GOOGLE_CLIENT_ID = import.meta.env.VITE_CLIENT_ID_DE_GOOGLE;
console.log("Mi Client ID es:", GOOGLE_CLIENT_ID);
// Pantalla de entrada para elegir entre login o registro.
function AuthHome() {
	const navegar = useNavigate();
    const [error, setError] = useState("");

	const manejarLoginGoogle = async (credentialResponse) => {
        try {
            // Se manda el token de google al backend para validar que sea correcto
			// Y nos devuelve uno de nuestros tokens
            const data = await loginConGoogle(credentialResponse.credential);
            
			// Guardamos el token en el acceso local
			guardarToken(data.access_token);
            
            // Si todo va correcto, redirigimos al usuario a la pantalla principal
            navegar("/home");
        } catch (err) {
            setError(err.message || "Error al acceder con Google. Inténtalo de nuevo.");
        }
    };

	return (
		<section className="auth-home">
			<h1>Bienvenido a Codle</h1>
			<div className="auth-home-actions">
				<Link to="/login">
					<button type="button">Iniciar sesion</button>
				</Link>
				<Link to="/register">
					<button type="button">Registrar</button>
				</Link>

				<div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={manejarLoginGoogle}
                        onError={() => setError("El inicio de sesión con Google ha fallado.")}
                        text="Continuar con Google" 
                    />
                </div>

                {error && <p className="auth-error-msg">{error}</p>}

			</div>
		</section>
	);
}

function RutaProtegida({ children }) {
	if (!tieneSesionActiva()) {
		return <Navigate to="/login" replace />;
	}

	return children;
}

function RutaPublica({ children }) {
	if (tieneSesionActiva()) {
		return <Navigate to="/home" replace />;
	}

	return children;
}

function App() {
	return (
		<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
			<BrowserRouter>
				<div className="app-shell">
					<CodeBackdrop />
					<div className="app-content">
						<Routes>
							{/* Rutas principales de autenticacion */}
							<Route path="/" element={<AuthHome />} />
							<Route
								path="/login"
								element={
									<RutaPublica>
										<Login />
									</RutaPublica>
								}
							/>
							<Route
								path="/register"
								element={
									<RutaPublica>
										<Register />
									</RutaPublica>
								}
							/>
							<Route
								path="/clasico"
								element={
									<RutaProtegida>
										<Clasico />
									</RutaProtegida>
								}
							/>
							<Route
								path="/logo"
								element={
									<RutaProtegida>
										<Logo />
									</RutaProtegida>
								}
							/>
							<Route
								path="/codigo"
								element={
									<RutaProtegida>
										<Codigo />
									</RutaProtegida>
								}
							/>
							<Route
								path="/home"
								element={
									<RutaProtegida>
										<Home />
									</RutaProtegida>
								}
							/>
							<Route path="*" element={<Navigate to="/" replace />} />
						</Routes>
					</div>
				</div>
			</BrowserRouter>
		</GoogleOAuthProvider>
	);
}

export default App;
