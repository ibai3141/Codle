import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home(){

    const navigate = useNavigate();

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
            </div>

        </div>
        
    );
}

