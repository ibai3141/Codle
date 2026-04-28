import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Clasico from "../pages/Clasico";
import Logo from "../pages/Logo";
import Codigo from "../pages/Codigo";
import CodeBackdrop from "./components/CodeBackdrop";
import { tieneSesionActiva } from "./utils/session";
import "./AppPage.css";

// Pantalla de entrada para elegir entre login o registro.
function AuthHome() {
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
	);
}

export default App;
