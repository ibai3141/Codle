import { useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import {
  crearPartidaLogo,
  obtenerPartidaLogo,
  obtenerLenguajesActivos,
  enviarIntentoLogo as enviarIntentoApi,
} from "../api/api";

const MODOS = [
  { clave: "clasico", etiqueta: "Clasico", icono: "?", ruta: "/clasico" },
  { clave: "logo", etiqueta: "Logo", icono: "◎", ruta: "/logo" },
  { clave: "codigo", etiqueta: "Codigo", icono: "</>", ruta: "/codigo" },
];



export default function Logo(){
    const navigate = useNavigate();
    
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const [logoUrl, setLogoUrl] = useState("https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg");
    const [intentosUsados, setIntentosUsados] = useState(0);
    const [lenguajesIntentados, setLenguajesIntentados] = useState([]);
    const [catalogoLenguajes, setCatalogoLenguajes] = useState([]);
    const [token, setToken] = useState("");
    const [partidaId, setPartidaId] = useState(null);

    // 1. Por defecto, la lista de sugerencias está vacía
    let sugerencias = []; 

    // 2. Si el usuario ha escrito algo, llenamos la lista filtrando el catálogo
    if (textoBusqueda !== "") {
        sugerencias = catalogoLenguajes.filter(function(lenguaje){
            return lenguaje.nombre.toLowerCase().startsWith(textoBusqueda.toLowerCase());
        });
    }

    useEffect(()=>{
        async function inicializarPartida(){
            try{
                const tokenGuardado = localStorage.getItem("access_token");
                if (!tokenGuardado) {
                    setTimeout(function () {
                    navegar("/");
                    }, 1);
                    return;
                }

                setToken(tokenGuardado);
                const lenguajesIniciales = await obtenerLenguajesActivos();
                setCatalogoLenguajes(lenguajesIniciales)
            }
            catch(error){

            }
            
        }
        inicializarPartida()
    },[])

    return(
        <section>
            <div>
            {/* Modos*/}
            {MODOS.map(function (modo){
                return(
                    <button key={modo.clave} onClick={() => {navigate(modo.ruta)}}>
                        <span>{modo.icono}</span>
                        <span>{modo.etiqueta}</span>
                    </button>
                )
            })}
            </div>


            <div>
                <br />
                <img src={logoUrl} alt="Logo" style={{ width: "200px", height: "200px" }} />
                <br />
                <br />
                {/*Campo donde el usuario elige el lenguaje*/}
                <input type="text" placeholder="Escribe tu lenguaje" value={textoBusqueda} onChange={(evento)=>{
                    setTextoBusqueda(evento.target.value)}} ></input>

                {/*Botón de enviar*/}
                <button onClick={() => {setLenguajesIntentados([...lenguajesIntentados,textoBusqueda])}}>Enviar</button>
                <div>

                {/*Lista de sugerencias*/}
                {
                    
                    sugerencias.length > 0 ? (
                        
                        <ul role="listbox">
                        {sugerencias.map((lenguaje)=>{
                        
                        return(
                        <li key={lenguaje.id}>
                            <button>{lenguaje.nombre}</button>
                        </li>
                        )
                        
                    })}
                    </ul>
                    ) : null
                    
                }
                </div>

                {/*Lista de lenguajes fallados.*/}
                <div>
                    {lenguajesIntentados.map(function(lenguaje, index){
                        return(
                        <span key={index}>{lenguaje} </span> 
                        )              
                    })}
                </div>              
            </div>
        </section>
        
    )
}