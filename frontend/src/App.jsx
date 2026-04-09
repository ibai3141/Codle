import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Pantalla de entrada para elegir entre login o registro.
function AuthHome() {
  return (
    <section style={{ maxWidth: 500, margin: "2rem auto" }}>
      <h1>Bienvenido a Codle</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
