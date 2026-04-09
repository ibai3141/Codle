import { useState } from "react";
import { Link } from "react-router-dom";
import { login as loginApi } from "../api/api";

export default function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
        // Si el backend devuelve token, lo guardamos para futuras rutas protegidas.
        const data = await loginApi(email, password);
        if (data?.access_token) {
            localStorage.setItem("access_token", data.access_token);
        }
        setSuccess("Login correcto.");
        } catch (error) {
            setError(error.message || "No se pudo iniciar sesion.");
        } finally {
            setLoading(false);
        }
  };

  return (
    <section style={{ maxWidth: 420, margin: "2rem auto" }}>
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
          style={{ width: "100%", marginBottom: "1rem" }}
        />

        <label htmlFor="password">Contrasena</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{ width: "100%", marginBottom: "1rem" }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p style={{ marginTop: "0.75rem" }}>
        <Link to="/">
          <button type="button">Volver al inicio</button>
        </Link>
      </p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {success ? <p style={{ color: "green" }}>{success}</p> : null}
    </section>
  );
}
