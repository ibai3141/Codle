import { useEffect, useRef } from "react";

const SNIPPETS = [
  "const guess = normalize(input);",
  "if (guess === target) return true;",
  "function startGame(mode) {",
  "print('Codle');",
  "SELECT * FROM lenguaje;",
  "SELECT nombre FROM lenguaje WHERE activo = true;",
  "INSERT INTO partida (modo, puntuacion) VALUES ('clasico', 0);",
  "UPDATE usuario SET email = 'ibai@example.com';",
  "for (let i = 0; i < 3; i++) {",
  "return score + bonus;",
  "class PlayerSession:",
  "def iniciar_partida(usuario_id):",
  "resultado = len(intentos) + 1",
  "if lenguaje == 'Python':",
  "print(sum([1, 2, 3]))",
  "console.log('Try again');",
  "while (attempts < maxAttempts) {",
  "token = create_access_token(payload)",
  "match mode:",
  "snippet_output == expected_output",
  "router.post('/game/start')",
  "background: linear-gradient(...)",
  "let alias = input.toLowerCase();",
  "public class JuegoCodle {",
  "System.out.println('Hola Codle');",
  "List<String> modos = Arrays.asList('clasico', 'logo');",
  "if (usuario != null) { return token; }",
  "std::cout << \"Codle\" << std::endl;",
  "std::vector<int> intentos = {1, 2, 3};",
  "for (const auto& lenguaje : lenguajes) {",
  "int puntuacion = intentos_usados * 10;",
  "puts 'Bienvenido a Codle'",
  "3.times do |i| puts i end",
  "usuario = { nombre: 'Ibai', modo: 'logo' }",
  "def resolver_salida(snippet)",
  "let resultado = guess.trim();",
  "fn main() { println!(\"Codle\"); }",
  "let puntuacion: i32 = 100;",
  "match estado { 'ganada' => 1, _ => 0 }",
  "let lenguajes = vec![\"Rust\", \"Python\", \"Ruby\"];",
  "cout << lenguaje.nombre();",
  "String modo = request.getModo();",
  "boolean acierto = guess.equals(target);",
  "SELECT COUNT(*) FROM intento_lenguaje;",
  "DELETE FROM lenguaje_alias WHERE alias = 'tmp';",
  "def validar_alias(alias_normalizado):",
  "resultado = respuesta.strip().lower()",
  "HashMap<String, Integer> ranking = new HashMap<>();",
  "std::string modo = \"codigo\";",
  "puts usuario[:email]",
  "fn calcular_score(intentos: i32) -> i32 {",
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createLine(width, height) {
  return {
    text: SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)],
    x: randomBetween(0, Math.max(width - 260, 40)),
    y: randomBetween(-height, height),
    speed: randomBetween(0.40, 0.55),
    opacity: randomBetween(0.14, 0.3),
    fontSize: randomBetween(14, 21),
    drift: randomBetween(-0.08, 0.08),
    hue: Math.random() > 0.55 ? "125, 211, 252" : "147, 197, 253",
  };
}

export default function CodeBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let lines = [];

    const setCanvasSize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);

      const totalLines = Math.max(34, Math.floor(width / 42));
      lines = Array.from({ length: totalLines }, () => createLine(width, height));
    };

    const drawBackgroundGlow = () => {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.05)");
      gradient.addColorStop(0.5, "rgba(14, 165, 233, 0.02)");
      gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      drawBackgroundGlow();

      for (const line of lines) {
        line.y += line.speed;
        line.x += line.drift;

        if (line.y > height + 40 || line.x < -280 || line.x > width + 50) {
          Object.assign(line, createLine(width, height), {
            y: randomBetween(-180, -20),
          });
        }

        const fadeZone = Math.min(220, height * 0.25);
        let alpha = line.opacity;

        if (line.y < fadeZone) {
          alpha *= Math.max(0.15, line.y / fadeZone);
        } else if (line.y > height - fadeZone) {
          alpha *= Math.max(0.12, (height - line.y) / fadeZone);
        }

        context.font = `${line.fontSize}px ui-monospace, Consolas, monospace`;
        context.fillStyle = `rgba(${line.hue}, ${alpha})`;
        context.shadowBlur = 10;
        context.shadowColor = `rgba(${line.hue}, ${Math.min(alpha, 0.18)})`;
        context.fillText(line.text, line.x, line.y);
      }

      context.shadowBlur = 0;
      context.shadowColor = "transparent";

      animationFrameId = window.requestAnimationFrame(render);
    };

    setCanvasSize();
    render();
    window.addEventListener("resize", setCanvasSize);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="code-backdrop" aria-hidden="true" />;
}
