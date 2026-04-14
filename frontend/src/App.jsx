import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Clasico from "../pages/Clasico";
import Logo from "../pages/Logo";
import Codigo from "../pages/Codigo";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas principales de autenticacion */}
        <Route path="/" element={<AuthHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/clasico" element={<Clasico />} />
        <Route path="/logo" element={<Logo />} />
        <Route path="/codigo" element={<Codigo />} />
        <Route path="/home" element={<Home />} />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
