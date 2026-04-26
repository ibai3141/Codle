import { useNavigate } from "react-router-dom";
import { cerrarSesionCompleta } from "../src/utils/session";
import "./Home.css";

export default function Home(){

    const navigate = useNavigate();

    function cerrarSesion() {
        cerrarSesionCompleta();
        navigate("/");
    }

    return(
        <div className="home-page">
            <h1>CODLE</h1>

            <div className="home-actions">
                <button onClick={() => navigate("/clasico")}>
                    Clasico
                </button>
                <button onClick={() => navigate("/logo")}>
                    Logo
                </button>
                <button onClick={() => navigate("/codigo")}>
                    Codigo
                </button>
                <button className="home-logout" onClick={cerrarSesion}>
                    Cerrar sesion
                </button>
            </div>

        </div>
        
    );
}
