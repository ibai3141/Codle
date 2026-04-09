import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../api/api";

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
    <section style={{ maxWidth: 420, margin: "2rem auto" }}>
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
          style={{ width: "100%", marginBottom: "1rem" }}
        />

        <label htmlFor="password">Contrasena</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          style={{ width: "100%", marginBottom: "1rem" }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem" }}>
        Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link>
      </p>
      <p style={{ marginTop: "0.5rem" }}>
        <Link to="/">
          <button type="button">Volver al inicio</button>
        </Link>
      </p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {success ? <p style={{ color: "green" }}>{success}</p> : null}
    </section>
  );
}
