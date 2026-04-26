import { useEffect, useRef } from "react";

// Fragmentos de codigo que se mostraran flotando en el fondo.
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
	'std::cout << "Codle" << std::endl;',
	"std::vector<int> intentos = {1, 2, 3};",
	"for (const auto& lenguaje : lenguajes) {",
	"int puntuacion = intentos_usados * 10;",
	"puts 'Bienvenido a Codle'",
	"3.times do |i| puts i end",
	"usuario = { nombre: 'Ibai', modo: 'logo' }",
	"def resolver_salida(snippet)",
	"let resultado = guess.trim();",
	'fn main() { println!("Codle"); }',
	"let puntuacion: i32 = 100;",
	"match estado { 'ganada' => 1, _ => 0 }",
	'let lenguajes = vec!["Rust", "Python", "Ruby"];',
	"cout << lenguaje.nombre();",
	"String modo = request.getModo();",
	"boolean acierto = guess.equals(target);",
	"SELECT COUNT(*) FROM intento_lenguaje;",
	"DELETE FROM lenguaje_alias WHERE alias = 'tmp';",
	"def validar_alias(alias_normalizado):",
	"resultado = respuesta.strip().lower()",
	"HashMap<String, Integer> ranking = new HashMap<>();",
	'std::string modo = "codigo";',
	"puts usuario[:email]",
	"fn calcular_score(intentos: i32) -> i32 {",
];

function randomBetween(min, max) {
	// Devuelve un numero aleatorio entre dos valores.
	return Math.random() * (max - min) + min;
}

function createLine(width, height) {
	// Crea una linea de codigo con propiedades aleatorias para que
	// cada una tenga una posicion, tamano y movimiento ligeramente distinto.
	return {
		// El texto de la linea se elige al azar de la lista de snippets.
		text: SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)],
		// Posicion horizontal inicial.
		x: randomBetween(0, Math.max(width - 260, 40)),
		// Posicion vertical inicial. Puede empezar incluso fuera de pantalla.
		y: randomBetween(-height, height),
		// Velocidad a la que cae la linea.
		speed: randomBetween(0.4, 0.55),
		// Transparencia base de la linea.
		opacity: randomBetween(0.14, 0.3),
		// Tamano de fuente variable para que no todas se vean iguales.
		fontSize: randomBetween(14, 21),
		// Pequeno desplazamiento lateral para evitar una caida totalmente recta.
		drift: randomBetween(-0.08, 0.08),
		// Se alternan dos tonos frios para mantener el estilo del fondo.
		hue: Math.random() > 0.55 ? "125, 211, 252" : "147, 197, 253",
	};
}

export default function CodeBackdrop() {
	// Referencia al canvas real del DOM para poder dibujar sobre el.
	const canvasRef = useRef(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;

		// Contexto 2D del canvas. Es el objeto con el que se dibuja todo.
		const context = canvas.getContext("2d");
		if (!context) return undefined;

		// Variables internas de la animacion.
		let animationFrameId = 0;
		let width = 0;
		let height = 0;
		let lines = [];

		const setCanvasSize = () => {
			// Ajusta el tamano del canvas al de la ventana y regenera las lineas.
			// Se usa devicePixelRatio para que no se vea borroso en pantallas densas.
			const ratio = window.devicePixelRatio || 1;
			width = window.innerWidth;
			height = window.innerHeight;

			canvas.width = Math.floor(width * ratio);
			canvas.height = Math.floor(height * ratio);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(ratio, ratio);

			// Cuanto mas ancha sea la pantalla, mas lineas se dibujan.
			const totalLines = Math.max(34, Math.floor(width / 42));
			lines = Array.from({ length: totalLines }, () => createLine(width, height));
		};

		const drawBackgroundGlow = () => {
			// Dibuja un resplandor suave encima del canvas para que el fondo
			// tenga mas profundidad y no sea solo texto flotando.
			const gradient = context.createLinearGradient(0, 0, 0, height);
			gradient.addColorStop(0, "rgba(56, 189, 248, 0.05)");
			gradient.addColorStop(0.5, "rgba(14, 165, 233, 0.02)");
			gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
		};

		const render = () => {
			// Limpia el frame anterior y vuelve a pintar el fondo.
			context.clearRect(0, 0, width, height);
			drawBackgroundGlow();

			for (const line of lines) {
				// Actualiza la posicion de la linea para crear el movimiento.
				line.y += line.speed;
				line.x += line.drift;

				// Si la linea sale de pantalla, se recicla con nuevas propiedades
				// para que reaparezca arriba y la animacion parezca infinita.
				if (line.y > height + 40 || line.x < -280 || line.x > width + 50) {
					Object.assign(line, createLine(width, height), {
						y: randomBetween(-180, -20),
					});
				}

				// Hace que las lineas aparezcan y desaparezcan poco a poco
				// en la zona superior e inferior.
				const fadeZone = Math.min(220, height * 0.25);
				let alpha = line.opacity;

				if (line.y < fadeZone) {
					alpha *= Math.max(0.15, line.y / fadeZone);
				} else if (line.y > height - fadeZone) {
					alpha *= Math.max(0.12, (height - line.y) / fadeZone);
				}

				// Aplica estilo al texto y lo dibuja en el canvas.
				context.font = `${line.fontSize}px ui-monospace, Consolas, monospace`;
				context.fillStyle = `rgba(${line.hue}, ${alpha})`;
				context.shadowBlur = 10;
				context.shadowColor = `rgba(${line.hue}, ${Math.min(alpha, 0.18)})`;
				context.fillText(line.text, line.x, line.y);
			}

			// Resetea la sombra para que no afecte a futuros dibujos.
			context.shadowBlur = 0;
			context.shadowColor = "transparent";

			// Solicita el siguiente frame de animacion.
			animationFrameId = window.requestAnimationFrame(render);
		};

		// Inicializa el canvas, arranca la animacion y escucha cambios de tamano.
		setCanvasSize();
		render();
		window.addEventListener("resize", setCanvasSize);

		return () => {
			// Limpieza al desmontar el componente.
			window.removeEventListener("resize", setCanvasSize);
			window.cancelAnimationFrame(animationFrameId);
		};
	}, []);

	// Canvas decorativo de fondo. aria-hidden porque no aporta contenido accesible.
	return <canvas ref={canvasRef} className="code-backdrop" aria-hidden="true" />;
}
