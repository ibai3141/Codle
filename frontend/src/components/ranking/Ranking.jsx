import "./Ranking.css";

// Funcion para formatear la fecha a un formato mas legible.
function formatDate(dateString) {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function Ranking({
    abierto,
    alCerrar,
    listaRanking,
    idPartidaActual,
    puntuacion,
    partidaGanada = true,
}) {
    if (!abierto) return null;

    return (
        <div className="ranking-overlay" onClick={alCerrar}>
            <button
                className="ranking-cerrar"
                onClick={alCerrar}
                aria-label="Cerrar ranking"
                type="button"
            >
                ×
            </button>
            <div
                className="ranking-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ranking-titulo"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`ranking-exito ${partidaGanada ? "" : "ranking-exito--neutral"}`}>
                    <h2 id="ranking-titulo">
                        {partidaGanada
                            ? `¡Has ganado con ${puntuacion} puntos!`
                            : `Partida finalizada con ${puntuacion} puntos`}
                    </h2>
                </div>

                <h2><b>Ranking de tus partidas</b></h2>

                {listaRanking.length === 0 ? (
                    <p>No hay partidas todavia.</p>
                ) : (
                    <div className="ranking-tabla-wrap">
                        <table className="ranking-tabla">
                            <thead>
                                <tr>
                                    <th scope="col">Partida</th>
                                    <th scope="col">Puntos</th>
                                    <th scope="col">Intentos</th>
                                    <th scope="col">Fecha</th>
                                </tr>
                            </thead>

                            <tbody>
                                {listaRanking.map((partida, index) => (
                                    <tr
                                        key={partida.id}
                                        className={partida.id === idPartidaActual ? "fila-destacada" : ""}
                                    >
                                        <td>{index + 1}</td>
                                        <td>{partida.puntuacion}</td>
                                        <td>{partida.intentos_usados}</td>
                                        <td>{formatDate(partida.finalizada_en)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
