import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../api/api";
import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Registramos y, si todo va bien, llevamos al usuario al login.
      await registerApi({ email, password });
      setSuccess("Cuenta creada correctamente. Redirigiendo al login...");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-page">
      <h1>Registro</h1>

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

      {error ? <p className="register-error">{error}</p> : null}
      {success ? <p className="register-success">{success}</p> : null}
    </section>
  );
}
