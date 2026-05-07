import "./Ranking.css";

// Funcion para formatear la fecha a un formato más legible
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


export default function Ranking({ abierto, alCerrar, listaRanking }) {
    if (!abierto) return null;

    return (
        <div className="ranking-overlay">
            <div className="ranking-modal" role="dialog" aria-modal="true">
                <h2>¡Has ganado!</h2>
                <p>Ranking de tus partidas</p>

                {listaRanking.length === 0 ? (
                    <p>No hay partidas todavía.</p>
                ) : (
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
                                <tr key={partida.id}>
                                    <td>{index + 1}</td>
                                    <td>{partida.puntuacion}</td>
                                    <td>{partida.intentos_usados}</td>
                                    <td>{formatDate(partida.finalizada_en)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <button onClick={alCerrar}>Cerrar</button>
            </div>
        </div>
    );
}