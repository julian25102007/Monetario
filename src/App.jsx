import { useEffect, useMemo, useState } from "react";

const NOMBRES = {
  USD: "Dólar estadounidense", MXN: "Peso mexicano", EUR: "Euro", GBP: "Libra esterlina",
  CAD: "Dólar canadiense", JPY: "Yen japonés", CNY: "Yuan chino", BRL: "Real brasileño",
  ARS: "Peso argentino", COP: "Peso colombiano", CLP: "Peso chileno", PEN: "Sol peruano",
  GTQ: "Quetzal guatemalteco", CHF: "Franco suizo", KRW: "Won surcoreano", INR: "Rupia india",
};

const dinero = (n, moneda) => {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda }).format(n);
  } catch {
    return `${n.toFixed(2)} ${moneda}`;
  }
};

function cargarFavoritos() {
  try {
    const guardados = JSON.parse(localStorage.getItem("cambioya_favs"));
    if (Array.isArray(guardados) && guardados.length) return guardados;
  } catch {}
  return [["USD", "MXN"], ["EUR", "MXN"]];
}

export default function App() {
  const [datos, setDatos] = useState({ rates: null, updated: null, live: false });
  const [error, setError] = useState(false);
  const [cantidad, setCantidad] = useState("100");
  const [de, setDe] = useState("USD");
  const [a, setA] = useState("MXN");
  const [favs, setFavs] = useState(cargarFavoritos);

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then(setDatos)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cambioya_favs", JSON.stringify(favs)); } catch {}
  }, [favs]);

  const monedas = useMemo(
    () => (datos.rates ? Object.keys(NOMBRES).filter((m) => datos.rates[m]).sort() : []),
    [datos.rates]
  );

  const valor = parseFloat(cantidad);
  const valido = !isNaN(valor) && valor >= 0;
  const tasa = datos.rates ? datos.rates[a] / datos.rates[de] : null;

  const intercambiar = () => { setDe(a); setA(de); };
  const guardarFav = () => {
    if (!favs.some(([f, t]) => f === de && t === a)) setFavs([...favs, [de, a]]);
  };
  const quitarFav = (i) => setFavs(favs.filter((_, idx) => idx !== i));

  return (
    <main>
      <h1>CambioYa</h1>
      <p className="sub">Convierte monedas con el tipo de cambio de hoy.</p>

      <section className="card" aria-label="Conversor">
        <label htmlFor="cantidad">Cantidad</label>
        <input
          id="cantidad" className="cantidad" type="number" inputMode="decimal"
          min="0" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
        />

        <div className="fila">
          <div>
            <label htmlFor="de">De</label>
            <select id="de" value={de} onChange={(e) => setDe(e.target.value)}>
              {monedas.map((m) => <option key={m} value={m}>{m} – {NOMBRES[m]}</option>)}
            </select>
          </div>
          <button className="swap" onClick={intercambiar} aria-label="Intercambiar monedas">⇄</button>
          <div>
            <label htmlFor="a">A</label>
            <select id="a" value={a} onChange={(e) => setA(e.target.value)}>
              {monedas.map((m) => <option key={m} value={m}>{m} – {NOMBRES[m]}</option>)}
            </select>
          </div>
        </div>

        <div className="resultado" aria-live="polite">
          {error && <p className="error">No se pudo conectar con el servidor. Intenta de nuevo en un momento.</p>}
          {!error && !datos.rates && <p className="rate">Cargando tipos de cambio…</p>}
          {datos.rates && !valido && <p className="rate">Escribe una cantidad válida.</p>}
          {datos.rates && valido && (
            <>
              <small>{dinero(valor, de)} equivalen a</small>
              <div className="grande">{dinero(valor * tasa, a)}</div>
              <div className="rate">1 {de} = {tasa.toFixed(4)} {a}</div>
              <span className={datos.live ? "estado" : "estado off"}>
                {datos.live
                  ? `Tipos de cambio en vivo · actualizado ${new Date(datos.updated).toLocaleDateString("es-MX")}`
                  : "Sin conexión con la fuente: usando valores de referencia"}
              </span>
            </>
          )}
        </div>
      </section>

      <h2>Mis conversiones favoritas</h2>
      <div className="favs">
        {favs.map(([f, t], i) => (
          <span className="chip-grupo" key={`${f}-${t}`}>
            <button className="chip" onClick={() => { setDe(f); setA(t); }}>{f} → {t}</button>
            <button className="quitar" onClick={() => quitarFav(i)} aria-label={`Quitar ${f} a ${t}`}>×</button>
          </span>
        ))}
      </div>
      <button className="link" onClick={guardarFav}>Guardar esta conversión</button>

      <div className="ad">Espacio para anuncio (aquí iría un banner de publicidad)</div>

      <Premium />
    </main>
  );
}

function Premium() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje("");
    try {
      const r = await fetch("/api/interes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      setMensaje(r.ok ? "¡Listo! Te avisaremos cuando Premium esté disponible." : d.error);
      if (r.ok) setEmail("");
    } catch {
      setMensaje("No se pudo enviar. Intenta de nuevo.");
    }
    setEnviando(false);
  };

  return (
    <section className="premium">
      <h3>CambioYa Premium</h3>
      <p>Recibe una alerta cuando el dólar llegue al precio que quieres, ve el historial de las últimas semanas y usa la app sin anuncios.</p>
      <form onSubmit={enviar}>
        <label htmlFor="correo" className="oculto">Correo electrónico</label>
        <input id="correo" type="email" placeholder="tu@correo.com" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Avísame"}</button>
      </form>
      <div className="msg" aria-live="polite">{mensaje}</div>
    </section>
  );
}
