import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
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

  useEffect(() => {
    fetch('/data/casos_por_anio.json').then((r) => r.json()).then(setDatosAnio);
    fetch('/data/casos_por_estado.json').then((r) => r.json()).then((datos) => {
      setDatosEstado([...datos].reverse());
    });
    fetch('/data/casos_por_anio_estado.json').then((r) => r.json()).then(setDatosAnioEstado);
    fetch('/data/meta.json').then((r) => r.json()).then(setMeta);
  }, []);

  const datosGraficaAnio = useMemo(() => {
    if (estadoSeleccionado === 'Nacional') return datosAnio;
    return datosAnioEstado[estadoSeleccionado] || [];
  }, [estadoSeleccionado, datosAnio, datosAnioEstado]);

  const nombresEstados = useMemo(() => {
    return Object.keys(datosAnioEstado).sort();
  }, [datosAnioEstado]);

  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

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
          hex_res6: { type: 'vector', url: 'pmtiles:///tiles/h3_res6.pmtiles' },
          hex_res8: { type: 'vector', url: 'pmtiles:///tiles/h3_res8.pmtiles' },
        },
        layers: [
          { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-opacity': 0.85 } },
          {
            id: 'hex_res6_fill',
            type: 'fill',
            source: 'hex_res6',
            'source-layer': 'hexagonos',
            minzoom: ZOOM_MID,
            maxzoom: ZOOM_CLOSE,
            paint: { 'fill-color': HEX_FILL_COLOR, 'fill-outline-color': 'rgba(245,195,78,0.18)' },
          },
          {
            id: 'hex_res8_fill',
            type: 'fill',
            source: 'hex_res8',
            'source-layer': 'hexagonos',
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
          maxWidth: 290, opacity: cargando ? 0 : 1, transform: cargando ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 700ms ease, transform 700ms ease',
        }}
      >
        <div className="brand-title" style={{ fontSize: 22, lineHeight: 1.1 }}>Brujula</div>
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
      </div>

      <button
        onClick={volverAMexico}
        className="glass"
        aria-label="Volver a la vista completa de Mexico"
        style={{
          position: 'absolute', top: 20, right: 20, padding: '10px 16px', cursor: 'pointer',
          fontSize: 12, color: 'var(--text)', fontFamily: 'Inter', border: 'none',
          opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 400ms',
        }}
      >
        Mexico completo
      </button>

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
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
              No estas sola ni solo. Aqui esta lo que puedes hacer ahora mismo.
            </div>

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
            <div style={{
              width: '100%', height: 480, borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--line)', marginBottom: 14, background: 'rgba(255,255,255,0.03)',
            }}>
              <iframe
                src={FUENTE_RNPDNO}
                title="Consulta Publica RNPDNO en vivo"
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
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

      {cargando ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', fontFamily: 'Inter', color: 'var(--text-muted)', fontSize: 14,
        }}>
          Cargando el mapa...
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
