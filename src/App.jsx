import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';

import { MapboxOverlay } from '@deck.gl/mapbox';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EMBER_GRADIENT = [
  [58, 46, 85, 0],
  [58, 46, 85, 90],
  [120, 80, 70, 140],
  [201, 122, 61, 180],
  [230, 160, 70, 220],
  [245, 195, 78, 255],
];

const ZOOM_MID = 5.5;
const ZOOM_FADE_END = 7;
const ZOOM_CLOSE = 10;
const CENTRO_MEXICO = [-102.5, 23.6];

const HEX_FILL_COLOR = [
  'interpolate', ['linear'], ['get', 'conteo'],
  0, 'rgba(100,80,120,0.55)',
  3, 'rgba(150,95,75,0.68)',
  10, 'rgba(201,122,61,0.82)',
  40, 'rgba(230,160,70,0.92)',
  150, 'rgba(245,195,78,1)',
];

const FUENTE_CNB = 'https://comisionacionaldebusqueda.segob.gob.mx/';
const FUENTE_AMBER = 'https://alertaamber.fgr.org.mx/';
const FUENTE_RNPDNO = 'https://consultapublicarnpdno.segob.gob.mx/consulta';
const FUENTE_CNB_COMISIONES = 'https://comisionacionaldebusqueda.segob.gob.mx/comisiones/';
const FUENTE_CNB_REPORTE = 'https://cnbreporteinicial.segob.gob.mx/';
const TEL_LINEA_VIDA = 'tel:8009112000';
const TEL_SAPTEL = 'tel:5552598121';
const FUENTE_MNDM_DIRECTORIO = 'https://memoriamndm.org/sobre-el-movndmx/directorio-de-colectivos/';
const FUENTE_NO_ESTAN_SOLAS = 'https://noestansolas.mx/en/directorio/';
const FUENTE_SOLECITO = 'https://www.facebook.com/colectivo.solecitodeveracruz/';
const TEL_SOLECITO = 'tel:+522282837089';
const FUENTE_MADRES_BUSCADORAS_SONORA = 'https://x.com/CeciPatriciaF';

// Directorio por estado: cobertura parcial, priorizando los estados con mas casos
// documentados. Cada entrada se verifico contra la pagina propia del colectivo o su
// perfil oficial en memoriamndm.org — nunca se incluye un telefono que no aparezca
// directamente en esa fuente (una linea equivocada es peor que no tener ninguna).
// Para estados sin entrada aqui, el panel de ayuda enlaza al directorio completo
// (MNDM / No Estan Solas) en vez de inventar un contacto.
// TODO: ampliar cobertura a mas estados; revisar periodicamente que los links sigan vivos.
const RECURSOS_POR_ESTADO = {
  'Estado De México': [
    { nombre: 'COBUPEM — Comisión de Búsqueda de Personas del Edomex', descripcion: 'Comisión oficial estatal de búsqueda.', url: 'https://cobupem.edomex.gob.mx/' },
    { nombre: 'Buscándote con Amor (Estado de México)', descripcion: 'Colectivo de familias en búsqueda.', url: 'https://buscandoteconamoredomex.com/' },
  ],
  Tamaulipas: [
    { nombre: 'Red de Desaparecidos en Tamaulipas (REDETAM)', descripcion: 'Colectivo de familias. Contacto: contacto@desaparecidostamaulipas.com.mx', url: 'https://www.facebook.com/RedDeDesaparecidosEnTamaulipas' },
  ],
  Sinaloa: [
    { nombre: 'Sabuesos Guerreras, A.C.', descripcion: 'Colectivo de familias. Contacto: sabuesosguerreras2018@gmail.com', url: 'https://www.facebook.com/1234sabuesosguerreras/' },
  ],
  Sonora: [
    { nombre: 'Madres Buscadoras de Sonora', descripcion: 'Cuenta oficial verificada en X.', url: FUENTE_MADRES_BUSCADORAS_SONORA },
  ],
  Jalisco: [
    { nombre: 'Madres Buscadoras de Jalisco', descripcion: 'Colectivo de familias en búsqueda.', url: 'https://www.facebook.com/madresbuscadorasdejalisco/' },
  ],
  Veracruz: [
    { nombre: 'Colectivo Solecito', descripcion: `Línea Solecito: ${TEL_SOLECITO.replace('tel:', '')}`, url: FUENTE_SOLECITO, tel: TEL_SOLECITO },
  ],
  Guanajuato: [
    { nombre: 'Buscadoras Gto', descripcion: 'Colectivo de familias en búsqueda, con sede en León.', url: 'https://www.facebook.com/p/Buscadoras-Gto-100064354976899/' },
  ],
};

const PASOS_PRIMERAS_HORAS = [
  'No existen las "24, 48 o 72 horas de espera" para reportar. Es un mito sin sustento legal: la autoridad debe iniciar la búsqueda desde el primer momento en que reportas.',
  'Reúne lo que tengas a la mano: fotos recientes (de frente y de cuerpo completo), señas particulares (tatuajes, cicatrices, lunares), la ropa que llevaba puesta, y a dónde iba o con quién.',
  'Guarda copia de todo lo que compartas con la autoridad: número de carpeta de investigación, capturas de pantalla, nombre de quien te atendió.',
  'Contacta también a un colectivo de tu estado, además de reportar: conocen el terreno y el proceso real, y pueden acompañarte.',
  'Antes de publicar datos sensibles del caso en redes, coméntalo con la autoridad o un colectivo: en algunos casos exponerlos puede poner en riesgo a la persona buscada.',
];

const REFERENCIA_OFICIAL = {
  totalDesaparecidos: 135117,
  fechaConsulta: '20 de julio de 2026',
};

const FUENTES_OFICIALES = [
  {
    nombre: 'Consulta Publica RNPDNO',
    descripcion: 'Fichas reales, con foto, actualizadas cada 72 horas. El propio portal invita a compartirlas: si reconoces a alguien, tu ayuda puede hacer la diferencia.',
    url: FUENTE_RNPDNO,
    destacada: true,
  },
  {
    nombre: 'Alerta AMBER Mexico',
    descripcion: 'Fichas activas de ninas, ninos y adolescentes desaparecidos, con foto y datos, de la Fiscalia General de la Republica.',
    url: FUENTE_AMBER,
  },
  {
    nombre: 'Comision Nacional de Busqueda',
    descripcion: 'Dependencia federal responsable de la busqueda de personas desaparecidas en Mexico.',
    url: FUENTE_CNB,
  },
];

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [totalCasos, setTotalCasos] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [panelFichas, setPanelFichas] = useState(false);
  const [panelGraficas, setPanelGraficas] = useState(false);
  const [panelAyuda, setPanelAyuda] = useState(false);
  const [datosAnio, setDatosAnio] = useState([]);
  const [datosEstado, setDatosEstado] = useState([]);
  const [datosAnioEstado, setDatosAnioEstado] = useState({});
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('Nacional');
  const [meta, setMeta] = useState(null);
  const [datosNoticias, setDatosNoticias] = useState([]);
const [panelNoticias, setPanelNoticias] = useState(false);
const [panelMetodologia, setPanelMetodologia] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null);
  const [iframeCompleto, setIframeCompleto] = useState(false);

  useEffect(() => {
    fetch('/data/casos_por_anio.json').then((r) => r.json()).then(setDatosAnio);
    fetch('/data/casos_por_estado.json').then((r) => r.json()).then((datos) => {
      setDatosEstado([...datos].reverse());
    });
    fetch('/data/casos_por_anio_estado.json').then((r) => r.json()).then(setDatosAnioEstado);
    fetch('/data/meta.json').then((r) => r.json()).then(setMeta);
    fetch('/data/noticias.json').then((r) => r.json()).then(setDatosNoticias);
  }, []);

  const datosGraficaAnio = useMemo(() => {
    if (estadoSeleccionado === 'Nacional') return datosAnio;
    return datosAnioEstado[estadoSeleccionado] || [];
  }, [estadoSeleccionado, datosAnio, datosAnioEstado]);

  const nombresEstados = useMemo(() => {
    return Object.keys(datosAnioEstado).sort();
  }, [datosAnioEstado]);

  useEffect(() => {
    

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap, &copy; CARTO',
          },
          hex_res6: { type: 'geojson', data: '/data/h3_res6.geojson' },
hex_res8: { type: 'geojson', data: '/data/h3_res8.geojson' },
        },
        layers: [
          { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-opacity': 0.85 } },
          {
  id: 'hex_res6_fill',
  type: 'fill',
  source: 'hex_res6',
  minzoom: ZOOM_MID,
  maxzoom: ZOOM_CLOSE,
  paint: { 'fill-color': HEX_FILL_COLOR, 'fill-outline-color': 'rgba(245,195,78,0.18)' },
},
          {
            id: 'hex_res8_fill',
            type: 'fill',
            source: 'hex_res8',
            minzoom: ZOOM_CLOSE,
            paint: { 'fill-color': HEX_FILL_COLOR, 'fill-outline-color': 'rgba(245,195,78,0.18)' },
          },
        ],
      },
      center: CENTRO_MEXICO,
      zoom: 3.2,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
const alTocarHexagono = (e) => {
  if (!e.features || e.features.length === 0) return;
  const propiedades = e.features[0].properties;
  setCeldaSeleccionada({
  conteo: propiedades.conteo,
  estado: propiedades.estado || 'No determinado',
  h3_index: propiedades.h3_index,
  lat: e.lngLat.lat,
  lng: e.lngLat.lng,
});
};

map.on('click', 'hex_res6_fill', alTocarHexagono);
map.on('click', 'hex_res8_fill', alTocarHexagono);
map.on('mouseenter', 'hex_res6_fill', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'hex_res6_fill', () => { map.getCanvas().style.cursor = ''; });
map.on('mouseenter', 'hex_res8_fill', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'hex_res8_fill', () => { map.getCanvas().style.cursor = ''; });
    map.on('load', async () => {
      const respuesta = await fetch('/data/heat_points.json');
      const puntos = await respuesta.json();
      setTotalCasos(puntos.reduce((suma, p) => suma + p.peso, 0));

      const construirCapa = (opacidad) => new HeatmapLayer({
        id: 'heatmap-casos',
        data: puntos,
        getPosition: (d) => [d.lng, d.lat],
        getWeight: (d) => d.peso,
        radiusPixels: 90,
        intensity: 1.1,
        threshold: 0.002,
        colorRange: EMBER_GRADIENT,
        opacity: opacidad,
      });

      const overlay = new MapboxOverlay({ interleaved: true, layers: [construirCapa(1)] });
      map.addControl(overlay);

      map.on('zoom', () => {
        const z = map.getZoom();
        let opacidad = 1;
        if (z >= ZOOM_MID) {
          opacidad = Math.max(0, 1 - (z - ZOOM_MID) / (ZOOM_FADE_END - ZOOM_MID));
        }
        overlay.setProps({ layers: [construirCapa(opacidad)] });
      });

      map.flyTo({ center: CENTRO_MEXICO, zoom: 4.6, duration: 2600, essential: true });
      setCargando(false);
    });

    return () => map.remove();
  }, []);

  const buscarLugar = useCallback(async (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusqueda('');
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 6000);
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&countrycodes=mx&limit=1&q=' + encodeURIComponent(busqueda);
      const resultado = await fetch(url, { headers: { 'Accept-Language': 'es' }, signal: controlador.signal });
      const datos = await resultado.json();
      if (datos.length === 0) {
        setErrorBusqueda('No se encontro esa zona. Intenta con otro nombre.');
        return;
      }
      const lat = parseFloat(datos[0].lat);
      const lon = parseFloat(datos[0].lon);
      mapRef.current.flyTo({ center: [lon, lat], zoom: 11, duration: 1800 });
    } catch (err) {
      if (err.name === 'AbortError') {
        setErrorBusqueda('La busqueda tardo demasiado. Intenta de nuevo.');
      } else {
        setErrorBusqueda('No se pudo buscar en este momento. Intenta de nuevo.');
      }
    } finally {
      clearTimeout(limite);
      setBuscando(false);
    }
  }, [busqueda]);

  const volverAMexico = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: CENTRO_MEXICO, zoom: 4.6, duration: 1800 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

     <div
  className="glass"
  style={{
    position: 'absolute', top: 20, left: 20, padding: '18px 22px',
    maxWidth: 290, width: 'calc(100vw - 40px)', opacity: cargando ? 0 : 1,
    transform: cargando ? 'translateY(-8px)' : 'translateY(0)',
    transition: 'opacity 700ms ease, transform 700ms ease',
  }}
>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div className="brand-title" style={{ fontSize: 22, lineHeight: 1.1 }}>Brujula</div>
    <button
      onClick={() => setPanelAbierto(!panelAbierto)}
      aria-label={panelAbierto ? 'Minimizar panel' : 'Mostrar panel'}
      style={{
        border: 'none', background: 'transparent', color: 'var(--text-muted)',
        fontSize: 20, cursor: 'pointer', padding: '2px 8px', lineHeight: 1,
      }}
    >
      {panelAbierto ? '−' : '+'}
    </button>
  </div>
  {panelAbierto ? (
  <>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
          Incidencia de desapariciones por zona en Mexico. Datos agregados, historicos, del Registro Nacional.
        </div>

       {meta ? (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
    <div className="brand-title" style={{ fontSize: 26, color: 'var(--ember-mid)', lineHeight: 1 }}>
      {meta.total_casos.toLocaleString('es-MX')}
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
      casos documentados en el Registro Nacional
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
      Datos actualizados el {meta.fecha_actualizacion}
    </div>
    <div style={{
      fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8, paddingTop: 8,
      borderTop: '1px dashed var(--line)', lineHeight: 1.4,
    }}>
      La cifra oficial en vivo de la CNB reporta{' '}
      <strong style={{ color: 'var(--text)' }}>
        {REFERENCIA_OFICIAL.totalDesaparecidos.toLocaleString('es-MX')}
      </strong>{' '}
      personas actualmente desaparecidas o no localizadas a nivel nacional. La diferencia
      corresponde a registros confidenciales sin fecha verificable en la fuente publica masiva
      que usamos. Consultado el {REFERENCIA_OFICIAL.fechaConsulta}.
    </div>
  </div>
) : null}

        <button
          onClick={() => setPanelAyuda(true)}
          style={{
            marginTop: 14, width: '100%', padding: '12px 14px', borderRadius: 8,
            border: '2px solid var(--ember-high)', background: 'rgba(245,195,78,0.12)',
            color: 'var(--text)', fontSize: 14, fontFamily: 'Inter', cursor: 'pointer',
            textAlign: 'left', fontWeight: 700,
          }}
        >
          Estoy buscando a alguien
        </button>

        <form onSubmit={buscarLugar} style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar colonia o ciudad..."
            aria-label="Buscar colonia o ciudad"
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'rgba(10,15,28,0.6)', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={buscando}
            style={{
              padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--ember-mid)', color: '#1a1108', fontWeight: 600, fontSize: 13,
              fontFamily: 'Inter', opacity: buscando ? 0.6 : 1,
            }}
          >
            {buscando ? '...' : 'Ir'}
          </button>
        </form>
        {errorBusqueda ? (
          <div style={{ fontSize: 12, color: '#e0a56b', marginTop: 6 }}>{errorBusqueda}</div>
        ) : null}

        <button
          onClick={() => setPanelFichas(true)}
          style={{
            marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--line)', background: 'rgba(245,195,78,0.08)',
            color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
            textAlign: 'left', fontWeight: 500,
          }}
        >
          Ver fichas de busqueda reales
        </button>

        <button
          onClick={() => setPanelGraficas(true)}
          style={{
            marginTop: 8, width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--line)', background: 'rgba(255,255,255,0.04)',
            color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
            textAlign: 'left', fontWeight: 500,
          }}
        >
          Ver estadisticas
        </button>

        <button
  onClick={() => setPanelNoticias(true)}
  style={{
    marginTop: 8, width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'rgba(255,255,255,0.04)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
    textAlign: 'left', fontWeight: 500,
  }}
>
  Periodismo de investigacion
</button>

<button
  onClick={() => setPanelMetodologia(true)}
  style={{
    marginTop: 8, width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'rgba(255,255,255,0.04)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
    textAlign: 'left', fontWeight: 500,
  }}
>
  Como funciona este mapa
</button>
      </>
      ) : null}
      </div>

      <button
  onClick={volverAMexico}
  className="glass"
  aria-label="Volver a la vista completa de Mexico"
  title="Ver todo Mexico"
  style={{
    position: 'absolute', top: 20, right: 20, width: 40, height: 40, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 17, color: 'var(--text-muted)', border: 'none', borderRadius: '50%',
    opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 400ms, color 200ms',
  }}
  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ember-mid)'; }}
  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
>
  ⌂
</button>
{celdaSeleccionada ? (
        <div
          className="glass"
          style={{
            position: 'absolute', bottom: 20, left: 220, padding: '16px 20px',
            maxWidth: 260, animation: 'fadeIn 300ms ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="brand-title" style={{ fontSize: 24, color: 'var(--ember-mid)', lineHeight: 1 }}>
                {celdaSeleccionada.conteo.toLocaleString('es-MX')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                casos documentados en esta zona
              </div>
              {celdaSeleccionada.estado ? (
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  {celdaSeleccionada.estado}
                </div>
              ) : null}
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4, opacity: 0.75 }}>
  Los casos se concentran en el centro del municipio, no en la ubicacion exacta de cada uno
  (el registro nacional no publica esa ubicacion, por privacidad). En municipios muy extensos,
  el punto puede verse alejado de donde ocurrieron los casos reales.
</div>
            </div>
            <button
              onClick={() => setCeldaSeleccionada(null)}
              aria-label="Cerrar"
              style={{
                border: 'none', background: 'transparent', color: 'var(--text-muted)',
                fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <a
            href={FUENTE_CNB_COMISIONES}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', marginTop: 12, padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--ember-mid)', background: 'rgba(201,122,61,0.1)',
              color: 'var(--text)', fontSize: 12.5, fontWeight: 600, textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Contactar Comision de Busqueda
          </a>
          {celdaSeleccionada.estado && celdaSeleccionada.estado !== 'No determinado' ? (
            <button
              onClick={() => { setEstadoSeleccionado(celdaSeleccionada.estado); setPanelAyuda(true); }}
              style={{
                display: 'block', width: '100%', marginTop: 8, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--line)', background: 'transparent',
                color: 'var(--text)', fontSize: 12.5, fontWeight: 600, textAlign: 'center',
                cursor: 'pointer', fontFamily: 'Inter',
              }}
            >
              Ver ayuda y colectivos en {celdaSeleccionada.estado}
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className="glass"
        style={{
          position: 'absolute', bottom: 20, left: 20, padding: '14px 18px',
          opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 200ms',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Incidencia
        </div>
        <div style={{
          width: 160, height: 8, borderRadius: 4,
          background: 'linear-gradient(90deg, rgba(100,80,120,0.55), #c97a3d, #f5c34d)',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
          <span>Menor</span><span>Mayor</span>
        </div>
        {!cargando ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>
            {totalCasos.toLocaleString('es-MX')} casos agregados
          </div>
        ) : null}
      </div>

      {panelAyuda ? (
        <div
          role="dialog"
          aria-label="Estoy buscando a alguien"
          onClick={() => setPanelAyuda(false)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11,
          }}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="brand-title" style={{ fontSize: 20, marginBottom: 4 }}>Estoy buscando a alguien</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              No estas sola ni solo. Aqui esta lo que puedes hacer ahora mismo.
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember-high)', marginBottom: 8 }}>
              Qué hacer en las primeras horas
            </div>
            <ul style={{ margin: '0 0 20px', padding: '0 0 0 18px', listStyle: 'disc' }}>
              {PASOS_PRIMERAS_HORAS.map((paso) => (
                <li key={paso} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, marginBottom: 8 }}>
                  {paso}
                </li>
              ))}
            </ul>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember-high)', marginBottom: 8 }}>
              Apoyo emocional inmediato, gratuito
            </div>
            
            <a
              href={TEL_LINEA_VIDA}
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--line)', marginBottom: 8,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Linea de la Vida: 800 911 2000</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Gratuita, 24 horas, los 365 dias. Orientacion en salud mental y crisis emocional.
              </div>
            </a>
            
            <a
              href={TEL_SAPTEL}
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--line)', marginBottom: 20,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>SAPTEL: 55 5259 8121</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Gratuita, 24 horas. Contencion emocional y consejo psicologico por telefono.
              </div>
            </a>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember-high)', marginBottom: 8 }}>
              Iniciar o dar seguimiento a una busqueda
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
              No somos una autoridad. Te llevamos directo a los canales oficiales para que empieces
              sin perder tiempo:
            </div>
            
            <a
              href={FUENTE_CNB_REPORTE}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--ember-mid)', background: 'rgba(201,122,61,0.08)', marginBottom: 8,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Hacer un reporte inicial (CNB)</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Portal oficial de la Comision Nacional de Busqueda para reportar en linea.
              </div>
            </a>
            
            <a
              href={FUENTE_CNB_COMISIONES}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--line)', marginBottom: 20,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Comision de Busqueda de tu estado</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Directorio oficial de comisiones locales, con contacto por entidad.
              </div>
            </a>

<div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember-high)', marginBottom: 8 }}>
              Colectivos de busqueda{estadoSeleccionado !== 'Nacional' ? ` — ${estadoSeleccionado}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
              Suelen conocer el terreno y el proceso mejor que nadie. Cobertura parcial —
              verifica siempre antes de compartir informacion sensible.
            </div>

            {(RECURSOS_POR_ESTADO[estadoSeleccionado] || []).map((r) => (
              <a
                key={r.nombre}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid var(--ember-mid)', background: 'rgba(201,122,61,0.08)', marginBottom: 8,
                  textDecoration: 'none', color: 'var(--text)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {r.tel ? (
                    <a href={r.tel} style={{ color: 'var(--ember-mid)' }} onClick={(e) => e.stopPropagation()}>{r.descripcion}</a>
                  ) : r.descripcion}
                </div>
              </a>
            ))}
            {!RECURSOS_POR_ESTADO[estadoSeleccionado] && estadoSeleccionado !== 'Nacional' ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                Todavia no tenemos un colectivo verificado para {estadoSeleccionado} en esta lista.
                Busca en los directorios completos de abajo.
              </div>
            ) : null}

            <a
              href={FUENTE_MNDM_DIRECTORIO}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--line)', marginBottom: 8,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Directorio MNDM por estado</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Movimiento por Nuestros Desaparecidos en Mexico: mas de 50 colectivos, todos los estados.
              </div>
            </a>

            <a
              href={FUENTE_NO_ESTAN_SOLAS}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--line)', marginBottom: 20,
                textDecoration: 'none', color: 'var(--text)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Directorio "No Estan Solas"</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Colectivos, ONG y comisiones locales, filtrable por categoria.
              </div>
            </a>

            <button
              onClick={() => { setPanelAyuda(false); setPanelFichas(true); }}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, marginBottom: 8,
                border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)',
                fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
              }}
            >
              Ver fichas de busqueda reales
            </button>
            <button
              onClick={() => setPanelAyuda(false)}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                border: 'none', background: 'transparent', color: 'var(--text-muted)',
                fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {panelFichas ? (
        <div
          role="dialog"
          aria-label="Fichas de busqueda en fuentes oficiales"
          onClick={() => setPanelFichas(false)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, width: '90%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="brand-title" style={{ fontSize: 19, marginBottom: 4 }}>Fichas de busqueda</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              El Registro Nacional de Personas Desaparecidas existe para difundir cada caso y sumar ojos
              en su busqueda. Si reconoces a alguien en estas fichas, tu informacion puede ayudar a
              localizarla. Este mapa muestra solo datos agregados, asi que te llevamos directo a las
              fuentes oficiales donde puedes ver, compartir y reportar:
            </div>
            <button
  onClick={() => setIframeCompleto(true)}
  style={{
    display: 'block', width: '100%', padding: '14px', borderRadius: 10, marginBottom: 14,
    border: '1px solid var(--ember-mid)', background: 'rgba(201,122,61,0.1)',
    color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    textAlign: 'center',
  }}
>
  Ver Consulta Publica en vivo (pantalla completa)
</button>
            {FUENTES_OFICIALES.map(function (fuente) {
              return (
                
                  <a
                  key={fuente.url}
                  href={fuente.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', padding: '12px 14px', borderRadius: 10,
                    border: fuente.destacada ? '1px solid var(--ember-mid)' : '1px solid var(--line)',
                    background: fuente.destacada ? 'rgba(201,122,61,0.08)' : 'transparent',
                    marginBottom: 10,
                    textDecoration: 'none', color: 'var(--text)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fuente.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                    {fuente.descripcion}
                  </div>
                </a>
              );
            })}
            <button
              onClick={() => setPanelFichas(false)}
              style={{
                marginTop: 6, width: '100%', padding: '9px', borderRadius: 8,
                border: 'none', background: 'transparent', color: 'var(--text-muted)',
                fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {panelGraficas ? (
        <div
          role="dialog"
          aria-label="Estadisticas de incidencia"
          onClick={() => setPanelGraficas(false)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="brand-title" style={{ fontSize: 19, marginBottom: 4 }}>Estadisticas</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
              Datos agregados del Registro Nacional. No representan la totalidad de los casos:
              excluyen registros confidenciales sin fecha o municipio, ver el detalle en el mapa.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Casos por año</div>
              <select
                value={estadoSeleccionado}
                onChange={(e) => setEstadoSeleccionado(e.target.value)}
                style={{
                  fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--line)',
                  background: 'rgba(10,15,28,0.6)', color: 'var(--text)', fontFamily: 'Inter',
                }}
              >
                <option value="Nacional">Nacional</option>
                {nombresEstados.map(function (estado) {
                  return <option key={estado} value={estado}>{estado}</option>;
                })}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datosGraficaAnio}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="anio" tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} interval={9} />
                <YAxis tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} width={32} />
                <Tooltip
                  contentStyle={{ background: '#131b2e', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Line type="monotone" dataKey="casos" stroke="#f5c34d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <div style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Top 15 estados</div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={datosEstado} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} />
                <YAxis
                  type="category" dataKey="estado" width={110}
                  tick={{ fill: 'rgba(240,237,228,0.75)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ background: '#131b2e', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="casos" fill="#c97a3d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <button
              onClick={() => setPanelGraficas(false)}
              style={{
                marginTop: 18, width: '100%', padding: '9px', borderRadius: 8,
                border: 'none', background: 'transparent', color: 'var(--text-muted)',
                fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      {panelNoticias ? (
  <div
    role="dialog"
    aria-label="Periodismo de investigacion"
    onClick={() => setPanelNoticias(false)}
    style={{
      position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}
  >
    <div
      className="glass"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 480, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div className="brand-title" style={{ fontSize: 19, marginBottom: 4 }}>Periodismo de investigacion</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
        Titulares recientes de medios especializados en este tema, elegidos con cuidado editorial.
        El contenido completo vive en el sitio original.
      </div>
      {datosNoticias.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No hay articulos disponibles por ahora.</div>
      ) : null}
      {datosNoticias.map(function (nota, i) {
        return (
          <a
            key={i}
            href={nota.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--line)', marginBottom: 10,
              textDecoration: 'none', color: 'var(--text)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{nota.titulo}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>
              {nota.fuente} · {nota.fecha}
            </div>
          </a>
        );
      })}
      <button
        onClick={() => setPanelNoticias(false)}
        style={{
          marginTop: 6, width: '100%', padding: '9px', borderRadius: 8,
          border: 'none', background: 'transparent', color: 'var(--text-muted)',
          fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
) : null}

{panelMetodologia ? (
  <div
    role="dialog"
    aria-label="Metodologia"
    onClick={() => setPanelMetodologia(false)}
    style={{
      position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}
  >
    <div
      className="glass"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 520, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div className="brand-title" style={{ fontSize: 19, marginBottom: 4 }}>Como funciona este mapa</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
        La credibilidad de este proyecto depende de ser transparentes sobre como se construyen
        estos numeros. Aqui esta el proceso completo, sin caja negra.
      </div>

      {[
  {
    paso: 'Fuente oficial',
    texto: 'Los datos parten del Registro Nacional de Personas Desaparecidas y No Localizadas, publicados por la Comision Nacional de Busqueda ya sin informacion que identifique a nadie.',
  },
  {
    paso: 'Limpieza cuidadosa',
    texto: 'Revisamos y corregimos inconsistencias en los datos -- nombres de lugares mal escritos, formatos distintos, registros incompletos -- antes de que cualquier numero llegue al mapa.',
  },
  {
    paso: 'Sin duplicados',
    texto: 'Cuando una misma persona queda registrada mas de una vez por distintas autoridades, la contamos solo una.',
  },
  {
    paso: 'Privacidad primero',
    texto: 'Nunca mostramos casos individuales. Cuando una zona tiene muy pocos casos, la agregamos con zonas cercanas para que nadie pueda deducir de quien se trata.',
  },
  {
    paso: 'Trazabilidad total',
    texto: 'Cada actualizacion queda registrada con fecha exacta. Si preguntas "de donde salio este numero", siempre hay una respuesta precisa, nunca una suposicion.',
  },
  {
    paso: 'Se mantiene solo',
    texto: 'Un proceso automatico revisa la fuente oficial regularmente y actualiza el sitio sin intervencion manual, apenas hay algo nuevo que mostrar.',
  },
].map(function (item) {
        return (
          <div key={item.paso} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ember-mid)', marginBottom: 4 }}>
              {item.paso}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {item.texto}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => setPanelMetodologia(false)}
        style={{
          marginTop: 6, width: '100%', padding: '9px', borderRadius: 8,
          border: 'none', background: 'transparent', color: 'var(--text-muted)',
          fontSize: 13, fontFamily: 'Inter', cursor: 'pointer',
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
) : null}

      {cargando ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', fontFamily: 'Inter', color: 'var(--text-muted)', fontSize: 14,
        }}>
          Cargando el mapa...
        </div>
      ) : null}

{iframeCompleto ? (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 20, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      borderTop: '3px solid var(--ember-mid)',
    }}
  >
    <div
      style={{
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexShrink: 0, background: 'rgba(10,15,28,0.95)',
        backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="brand-title" style={{ fontSize: 16, color: 'var(--ember-mid)' }}>Brujula</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· viendo Consulta Publica RNPDNO</span>
      </div>
      <button
        onClick={() => setIframeCompleto(false)}
        style={{
          border: 'none', background: 'var(--ember-mid)', color: '#1a1108',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ← Volver al mapa
      </button>
    </div>
    <iframe
      src={FUENTE_RNPDNO}
      title="Consulta Publica RNPDNO en vivo, pantalla completa"
      style={{ flex: 1, width: '100%', border: 'none' }}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  </div>
) : null}

      <div
  style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 60px 10px 16px',
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    fontSize: 12, color: 'rgba(240,237,228,0.85)', background: 'rgba(10,15,28,0.85)',
    borderTop: '1px solid var(--line)', backdropFilter: 'blur(8px)',
    opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 500ms',
    pointerEvents: cargando ? 'none' : 'auto',
  }}
>
  <span>
    Datos: Registro Nacional de Personas Desaparecidas y No Localizadas (RNPDNO) · Proyecto civil independiente, sin afiliacion gubernamental.
  </span>
  <span style={{ opacity: 0.4 }}>·</span>
  <a
    href="https://affine.com.mx"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: 'var(--ember-mid)', textDecoration: 'none', flexShrink: 0, fontWeight: 600 }}
  >
    Un proyecto de Affine
  </a>
</div>
    </div>
  );
}
