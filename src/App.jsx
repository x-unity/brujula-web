import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'maplibre-gl/dist/maplibre-gl.css';

const EMBER_GRADIENT = [
  [58, 46, 85, 0],
  [58, 46, 85, 90],
  [120, 80, 70, 140],
  [201, 122, 61, 180],
  [230, 160, 70, 220],
  [245, 195, 78, 255],
];

const HEX_FILL_COLOR = [
  'interpolate', ['linear'], ['get', 'conteo'],
  0, 'rgba(100,80,120,0.55)',
  3, 'rgba(150,95,75,0.68)',
  10, 'rgba(201,122,61,0.82)',
  40, 'rgba(230,160,70,0.92)',
  150, 'rgba(245,195,78,1)',
];

const ZOOM_MID = 5.5;
const ZOOM_FADE_END = 7;
const ZOOM_CLOSE = 10;
const CENTRO_MEXICO = [-102.5, 23.6];

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

const PASOS_PRIMERAS_HORAS = [
  'Reporta de inmediato. No existen las 24, 48 o 72 horas de espera.',
  'Reune fotos recientes, senas particulares, ropa que llevaba, ultimo lugar visto y con quien iba.',
  'Guarda capturas, folios, carpeta de investigacion y nombre de cada persona que te atienda.',
  'Contacta a la comision de busqueda de tu estado y a un colectivo verificado.',
  'Antes de publicar datos sensibles en redes, consulta con autoridad o colectivo para no aumentar riesgos.',
];

const PREPARA_DATOS = [
  'Nombre completo, edad y fotografia reciente.',
  'Fecha, hora y lugar aproximado donde se le vio por ultima vez.',
  'Ropa, senas particulares, telefono, redes y posibles rutas.',
  'Personas con quienes iba o con quienes tuvo ultimo contacto.',
];

const FUENTES_OFICIALES = [
  {
    nombre: 'Consulta Publica RNPDNO',
    descripcion: 'Fichas reales, con foto, actualizadas desde la fuente oficial. Este proyecto no copia ni almacena fichas.',
    url: FUENTE_RNPDNO,
    destacada: true,
  },
  {
    nombre: 'Alerta AMBER Mexico',
    descripcion: 'Fichas activas de ninas, ninos y adolescentes desaparecidos, publicadas por la Fiscalia General de la Republica.',
    url: FUENTE_AMBER,
  },
  {
    nombre: 'Comision Nacional de Busqueda',
    descripcion: 'Dependencia federal responsable de la busqueda de personas desaparecidas en Mexico.',
    url: FUENTE_CNB,
  },
];

const ESTADOS_CANONICOS = {
  'aguascalientes': 'Aguascalientes',
  'baja california': 'Baja California',
  'baja california sur': 'Baja California Sur',
  'campeche': 'Campeche',
  'chiapas': 'Chiapas',
  'chihuahua': 'Chihuahua',
  'ciudad de mexico': 'Ciudad De México',
  'ciudad de méxico': 'Ciudad De México',
  'coahuila': 'Coahuila',
  'colima': 'Colima',
  'durango': 'Durango',
  'estado de mexico': 'Estado De México',
  'estado de méxico': 'Estado De México',
  'guanajuato': 'Guanajuato',
  'guerrero': 'Guerrero',
  'hidalgo': 'Hidalgo',
  'jalisco': 'Jalisco',
  'mexico': 'Estado De México',
  'méxico': 'Estado De México',
  'michoacan': 'Michoacán',
  'michoacán': 'Michoacán',
  'morelos': 'Morelos',
  'nayarit': 'Nayarit',
  'nuevo leon': 'Nuevo León',
  'nuevo león': 'Nuevo León',
  'oaxaca': 'Oaxaca',
  'puebla': 'Puebla',
  'queretaro': 'Querétaro',
  'querétaro': 'Querétaro',
  'quintana roo': 'Quintana Roo',
  'san luis potosi': 'San Luis Potosí',
  'san luis potosí': 'San Luis Potosí',
  'sinaloa': 'Sinaloa',
  'sonora': 'Sonora',
  'tabasco': 'Tabasco',
  'tamaulipas': 'Tamaulipas',
  'tlaxcala': 'Tlaxcala',
  'veracruz': 'Veracruz',
  'yucatan': 'Yucatán',
  'yucatán': 'Yucatán',
  'zacatecas': 'Zacatecas',
};

const normalizarEstado = (valor) => {
  if (!valor) return '';
  const limpio = valor.trim().toLowerCase().replace(/\s+/g, ' ');
  return ESTADOS_CANONICOS[limpio] || valor;
};

const estiloBoton = (tipo = 'secundario') => ({
  display: 'block',
  width: '100%',
  padding: tipo === 'principal' ? '13px 14px' : '10px 12px',
  borderRadius: 8,
  border: tipo === 'principal' ? '2px solid var(--ember-high)' : '1px solid var(--line)',
  background: tipo === 'principal' ? 'rgba(245,195,78,0.14)' : 'rgba(255,255,255,0.04)',
  color: 'var(--text)',
  fontSize: tipo === 'principal' ? 14 : 13,
  fontFamily: 'Inter',
  fontWeight: tipo === 'principal' ? 800 : 600,
  cursor: 'pointer',
  textAlign: 'left',
  textDecoration: 'none',
});

const estiloTarjeta = (destacada = false) => ({
  display: 'block',
  padding: '12px 14px',
  borderRadius: 10,
  border: destacada ? '1px solid var(--ember-mid)' : '1px solid var(--line)',
  background: destacada ? 'rgba(201,122,61,0.1)' : 'rgba(255,255,255,0.025)',
  marginBottom: 9,
  color: 'var(--text)',
  textDecoration: 'none',
});

function RecursoCard({ recurso }) {
  return (
    <a href={recurso.url} target="_blank" rel="noopener noreferrer" style={estiloTarjeta(recurso.tipo !== 'directorio')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>{recurso.nombre}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ember-high)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          {recurso.tipo}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4 }}>
        {recurso.tel ? (
          <span>
            {recurso.descripcion}{' '}
            <a href={recurso.tel} style={{ color: 'var(--ember-mid)', fontWeight: 700 }} onClick={(e) => e.stopPropagation()}>
              llamar
            </a>
          </span>
        ) : recurso.descripcion}
      </div>
      {recurso.confianza ? (
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 7, opacity: 0.72 }}>
          Fuente: {recurso.confianza}
        </div>
      ) : null}
    </a>
  );
}

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
  const [panelNoticias, setPanelNoticias] = useState(false);
  const [panelMetodologia, setPanelMetodologia] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [iframeCompleto, setIframeCompleto] = useState(false);
  const [datosAnio, setDatosAnio] = useState([]);
  const [datosEstado, setDatosEstado] = useState([]);
  const [datosAnioEstado, setDatosAnioEstado] = useState({});
  const [datosNoticias, setDatosNoticias] = useState([]);
  const [recursosApoyo, setRecursosApoyo] = useState({ estados: {}, directorios_generales: [] });
  const [meta, setMeta] = useState(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('Nacional');
  const [zonaActiva, setZonaActiva] = useState(null);

  useEffect(() => {
    fetch('/data/casos_por_anio.json').then((r) => r.json()).then(setDatosAnio);
    fetch('/data/casos_por_estado.json').then((r) => r.json()).then((datos) => setDatosEstado([...datos].reverse()));
    fetch('/data/casos_por_anio_estado.json').then((r) => r.json()).then(setDatosAnioEstado);
    fetch('/data/meta.json').then((r) => r.json()).then(setMeta);
    fetch('/data/noticias.json').then((r) => r.json()).then(setDatosNoticias);
    fetch('/data/recursos_apoyo.json').then((r) => r.json()).then(setRecursosApoyo);
  }, []);

  const nombresEstados = useMemo(() => Object.keys(datosAnioEstado).sort(), [datosAnioEstado]);

  const datosGraficaAnio = useMemo(() => {
    if (estadoSeleccionado === 'Nacional') return datosAnio;
    return datosAnioEstado[estadoSeleccionado] || [];
  }, [estadoSeleccionado, datosAnio, datosAnioEstado]);

  const recursosEstado = useMemo(() => {
    if (estadoSeleccionado === 'Nacional') return [];
    return recursosApoyo.estados?.[estadoSeleccionado] || [];
  }, [estadoSeleccionado, recursosApoyo]);

  const abrirAyudaParaEstado = useCallback((estado) => {
    if (estado && estado !== 'No determinado') setEstadoSeleccionado(estado);
    setPanelAyuda(true);
  }, []);

  const abrirGraficasParaEstado = useCallback((estado) => {
    if (estado && estado !== 'No determinado') setEstadoSeleccionado(estado);
    setPanelGraficas(true);
  }, []);

  const copiarZonaActiva = useCallback(async () => {
    if (!zonaActiva) return;
    const texto = [
      `Zona: ${zonaActiva.nombre || zonaActiva.estado || 'No determinada'}`,
      zonaActiva.estado ? `Estado: ${zonaActiva.estado}` : '',
      zonaActiva.conteo ? `Casos agregados en celda: ${zonaActiva.conteo}` : '',
      'Fuente: RNPDNO, datos agregados. No son ubicaciones exactas.',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // El portapapeles puede fallar en navegadores sin permiso; la accion no debe interrumpir el flujo.
    }
  }, [zonaActiva]);

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
      const estado = normalizarEstado(propiedades.estado || 'No determinado');
      setZonaActiva({
        tipo: 'celda',
        nombre: estado,
        conteo: propiedades.conteo,
        estado,
        h3_index: propiedades.h3_index,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
      if (estado !== 'No determinado') setEstadoSeleccionado(estado);
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
        const opacidad = z >= ZOOM_MID ? Math.max(0, 1 - (z - ZOOM_MID) / (ZOOM_FADE_END - ZOOM_MID)) : 1;
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
      const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=mx&limit=1&q=' + encodeURIComponent(busqueda);
      const resultado = await fetch(url, { headers: { 'Accept-Language': 'es' }, signal: controlador.signal });
      const datos = await resultado.json();
      if (datos.length === 0) {
        setErrorBusqueda('No se encontro esa zona. Intenta con otro nombre.');
        return;
      }
      const lat = parseFloat(datos[0].lat);
      const lon = parseFloat(datos[0].lon);
      const estado = normalizarEstado(datos[0].address?.state || datos[0].address?.region || '');
      setZonaActiva({
        tipo: 'busqueda',
        nombre: datos[0].display_name,
        estado: estado || 'No determinado',
        lat,
        lng: lon,
      });
      if (estado) setEstadoSeleccionado(estado);
      mapRef.current.flyTo({ center: [lon, lat], zoom: 11, duration: 1800 });
    } catch (err) {
      setErrorBusqueda(err.name === 'AbortError'
        ? 'La busqueda tardo demasiado. Intenta de nuevo.'
        : 'No se pudo buscar en este momento. Intenta de nuevo.');
    } finally {
      clearTimeout(limite);
      setBuscando(false);
    }
  }, [busqueda]);

  const volverAMexico = () => {
    mapRef.current?.flyTo({ center: CENTRO_MEXICO, zoom: 4.6, duration: 1800 });
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      <div
        className="glass"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '18px 22px',
          maxWidth: 318,
          width: 'calc(100vw - 40px)',
          opacity: cargando ? 0 : 1,
          transform: cargando ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'opacity 700ms ease, transform 700ms ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand-title" style={{ fontSize: 23, lineHeight: 1.1 }}>Brujula</div>
          <button
            onClick={() => setPanelAbierto(!panelAbierto)}
            aria-label={panelAbierto ? 'Minimizar panel' : 'Mostrar panel'}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '2px 8px', lineHeight: 1 }}
          >
            {panelAbierto ? '-' : '+'}
          </button>
        </div>

        {panelAbierto ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>
              Mapa de incidencia y ruta de accion para familias que buscan a una persona en Mexico.
            </div>

            {meta ? (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div className="brand-title" style={{ fontSize: 26, color: 'var(--ember-mid)', lineHeight: 1 }}>
                  {meta.total_casos.toLocaleString('es-MX')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  casos agregados usados por este mapa
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
                  Datos actualizados el {meta.fecha_actualizacion}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line)', lineHeight: 1.4 }}>
                  La cifra oficial en vivo de la CNB reporta <strong style={{ color: 'var(--text)' }}>{REFERENCIA_OFICIAL.totalDesaparecidos.toLocaleString('es-MX')}</strong> personas actualmente desaparecidas o no localizadas. Consultado el {REFERENCIA_OFICIAL.fechaConsulta}.
                </div>
              </div>
            ) : null}

            <button onClick={() => abrirAyudaParaEstado(zonaActiva?.estado)} style={{ ...estiloBoton('principal'), marginTop: 14 }}>
              Estoy buscando a alguien
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                Reportar, contactar y preparar informacion
              </div>
            </button>

            <form onSubmit={buscarLugar} style={{ marginTop: 12, display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar colonia, municipio o ciudad"
                aria-label="Buscar colonia, municipio o ciudad"
                style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(10,15,28,0.6)', color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', outline: 'none' }}
              />
              <button type="submit" disabled={buscando} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--ember-mid)', color: '#1a1108', fontWeight: 700, fontSize: 13, fontFamily: 'Inter', opacity: buscando ? 0.6 : 1 }}>
                {buscando ? '...' : 'Ir'}
              </button>
            </form>
            {errorBusqueda ? <div style={{ fontSize: 12, color: '#e0a56b', marginTop: 6 }}>{errorBusqueda}</div> : null}

            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <button onClick={() => setPanelFichas(true)} style={estiloBoton()}>Fichas oficiales en vivo</button>
              <button onClick={() => abrirGraficasParaEstado(zonaActiva?.estado)} style={estiloBoton()}>Ver estadisticas</button>
              <button onClick={() => setPanelNoticias(true)} style={estiloBoton()}>Periodismo de investigacion</button>
              <button onClick={() => setPanelMetodologia(true)} style={estiloBoton()}>Como funciona este mapa</button>
            </div>
          </>
        ) : null}
      </div>

      <button
        onClick={volverAMexico}
        className="glass"
        aria-label="Volver a la vista completa de Mexico"
        title="Ver todo Mexico"
        style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: 'var(--text-muted)', border: 'none', borderRadius: '50%', opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 400ms, color 200ms' }}
      >
        ⌂
      </button>

      {zonaActiva ? (
        <div
          className="glass"
          style={{ position: 'absolute', bottom: 64, left: 20, padding: '16px 18px', width: 'min(360px, calc(100vw - 40px))', animation: 'fadeIn 300ms ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--ember-high)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                {zonaActiva.tipo === 'busqueda' ? 'Zona buscada' : 'Celda del mapa'}
              </div>
              <div className="brand-title" style={{ fontSize: 22, color: 'var(--ember-mid)', lineHeight: 1.1, marginTop: 4 }}>
                {zonaActiva.conteo ? zonaActiva.conteo.toLocaleString('es-MX') : zonaActiva.estado}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                {zonaActiva.conteo ? 'casos documentados en esta zona agregada' : zonaActiva.nombre}
              </div>
            </div>
            <button onClick={() => setZonaActiva(null)} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
              x
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.45 }}>
            Este dato no es una ubicacion exacta. El RNPDNO publica municipio, no coordenadas personales; por privacidad, el mapa agrupa los casos.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button onClick={() => abrirAyudaParaEstado(zonaActiva.estado)} style={{ ...estiloBoton('principal'), padding: '10px 12px', fontSize: 12.5 }}>Ayuda aqui</button>
            <button onClick={() => abrirGraficasParaEstado(zonaActiva.estado)} style={{ ...estiloBoton(), padding: '10px 12px', fontSize: 12.5 }}>Tendencia</button>
            <button onClick={() => setPanelFichas(true)} style={{ ...estiloBoton(), padding: '10px 12px', fontSize: 12.5 }}>Fichas</button>
            <button onClick={copiarZonaActiva} style={{ ...estiloBoton(), padding: '10px 12px', fontSize: 12.5 }}>Copiar zona</button>
          </div>
        </div>
      ) : null}

      <div className="glass" style={{ position: 'absolute', bottom: 64, right: 78, padding: '14px 18px', opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 200ms' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Incidencia</div>
        <div style={{ width: 160, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, rgba(100,80,120,0.55), #c97a3d, #f5c34d)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
          <span>Menor</span><span>Mayor</span>
        </div>
        {!cargando ? <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>{totalCasos.toLocaleString('es-MX')} casos agregados</div> : null}
      </div>

      {panelAyuda ? (
        <div role="dialog" aria-label="Estoy buscando a alguien" onClick={() => setPanelAyuda(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11 }}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '92%', padding: 26, maxHeight: '86vh', overflowY: 'auto' }}>
            <div className="brand-title" style={{ fontSize: 22, marginBottom: 4 }}>Estoy buscando a alguien</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              No estas sola ni solo. Esta pantalla prioriza acciones concretas, fuentes oficiales y contactos que puedes verificar.
            </div>

            <div style={{ padding: 14, border: '1px solid var(--ember-mid)', borderRadius: 10, background: 'rgba(201,122,61,0.1)', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ember-high)', marginBottom: 8 }}>Ruta de 60 segundos</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <a href={FUENTE_CNB_REPORTE} target="_blank" rel="noopener noreferrer" style={estiloBoton('principal')}>1. Hacer reporte inicial en CNB</a>
                <a href={FUENTE_CNB_COMISIONES} target="_blank" rel="noopener noreferrer" style={estiloBoton()}>2. Buscar comision de tu estado</a>
                <button onClick={() => { setPanelAyuda(false); setPanelFichas(true); }} style={estiloBoton()}>3. Revisar fichas oficiales en vivo</button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <section>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ember-high)', marginBottom: 8 }}>Primeras horas</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                  {PASOS_PRIMERAS_HORAS.map((paso) => (
                    <li key={paso} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, marginBottom: 7 }}>{paso}</li>
                  ))}
                </ul>
              </section>

              <section>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ember-high)', marginBottom: 8 }}>Ten listo antes de llamar o reportar</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                  {PREPARA_DATOS.map((paso) => (
                    <li key={paso} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, marginBottom: 7 }}>{paso}</li>
                  ))}
                </ul>
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ember-high)' }}>Apoyo por estado</div>
                  <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)} style={{ fontSize: 12, maxWidth: 190, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'rgba(10,15,28,0.6)', color: 'var(--text)', fontFamily: 'Inter' }}>
                    <option value="Nacional">Selecciona estado</option>
                    {nombresEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                  Verifica siempre antes de compartir informacion sensible. Ultima revision de este directorio: {recursosApoyo.fecha_verificacion || 'pendiente'}.
                </div>
                {recursosEstado.map((recurso) => <RecursoCard key={recurso.nombre} recurso={recurso} />)}
                {estadoSeleccionado !== 'Nacional' && recursosEstado.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                    Aun no tenemos contactos verificados para {estadoSeleccionado}. Usa los directorios generales mientras ampliamos cobertura.
                  </div>
                ) : null}
                {(recursosApoyo.directorios_generales || []).map((recurso) => <RecursoCard key={recurso.nombre} recurso={recurso} />)}
              </section>

              <section>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ember-high)', marginBottom: 8 }}>Apoyo emocional inmediato</div>
                <a href={TEL_LINEA_VIDA} style={estiloTarjeta()}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Linea de la Vida: 800 911 2000</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Gratuita, 24 horas, los 365 dias.</div>
                </a>
                <a href={TEL_SAPTEL} style={estiloTarjeta()}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>SAPTEL: 55 5259 8121</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Contencion emocional y consejo psicologico por telefono.</div>
                </a>
              </section>
            </div>

            <button onClick={() => setPanelAyuda(false)} style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      ) : null}

      {panelFichas ? (
        <div role="dialog" aria-label="Fichas de busqueda en fuentes oficiales" onClick={() => setPanelFichas(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '90%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="brand-title" style={{ fontSize: 20, marginBottom: 4 }}>Fichas de busqueda</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              Este mapa solo muestra datos agregados. Para ver fichas con nombre, foto y estatus actual, abre la fuente oficial en vivo.
            </div>
            <button onClick={() => setIframeCompleto(true)} style={{ ...estiloBoton('principal'), textAlign: 'center', marginBottom: 14 }}>Ver Consulta Publica en vivo</button>
            {FUENTES_OFICIALES.map((fuente) => <RecursoCard key={fuente.url} recurso={{ ...fuente, tipo: fuente.destacada ? 'oficial' : 'fuente' }} />)}
            <button onClick={() => setPanelFichas(false)} style={{ marginTop: 6, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      ) : null}

      {panelGraficas ? (
        <div role="dialog" aria-label="Estadisticas de incidencia" onClick={() => setPanelGraficas(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="brand-title" style={{ fontSize: 20, marginBottom: 4 }}>Estadisticas</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
              Datos agregados del Registro Nacional. Sirven para contexto, no para ubicar casos individuales.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Casos por ano</div>
              <select value={estadoSeleccionado} onChange={(e) => setEstadoSeleccionado(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'rgba(10,15,28,0.6)', color: 'var(--text)', fontFamily: 'Inter' }}>
                <option value="Nacional">Nacional</option>
                {nombresEstados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datosGraficaAnio}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="anio" tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} interval={9} />
                <YAxis tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} width={32} />
                <Tooltip contentStyle={{ background: '#131b2e', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="casos" stroke="#f5c34d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 13, fontWeight: 700, margin: '20px 0 8px' }}>Top 15 estados</div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={datosEstado} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(240,237,228,0.5)', fontSize: 10 }} />
                <YAxis type="category" dataKey="estado" width={110} tick={{ fill: 'rgba(240,237,228,0.75)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#131b2e', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text)' }} />
                <Bar dataKey="casos" fill="#c97a3d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <button onClick={() => setPanelGraficas(false)} style={{ marginTop: 18, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      ) : null}

      {panelNoticias ? (
        <div role="dialog" aria-label="Periodismo de investigacion" onClick={() => setPanelNoticias(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="brand-title" style={{ fontSize: 20, marginBottom: 4 }}>Periodismo de investigacion</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>Titulares recientes de medios especializados. El contenido completo vive en el sitio original.</div>
            {datosNoticias.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No hay articulos disponibles por ahora.</div> : null}
            {datosNoticias.map((nota, i) => (
              <a key={i} href={nota.url} target="_blank" rel="noopener noreferrer" style={estiloTarjeta()}>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{nota.titulo}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>{nota.fuente} - {nota.fecha}</div>
              </a>
            ))}
            <button onClick={() => setPanelNoticias(false)} style={{ marginTop: 6, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      ) : null}

      {panelMetodologia ? (
        <div role="dialog" aria-label="Metodologia" onClick={() => setPanelMetodologia(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,28,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: '92%', padding: 26, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="brand-title" style={{ fontSize: 20, marginBottom: 4 }}>Como funciona este mapa</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>La credibilidad depende de explicar como se construyen estos numeros y que no significan.</div>
            {[
              ['Fuente oficial', 'Los datos parten del Registro Nacional de Personas Desaparecidas y No Localizadas.'],
              ['Datos agregados', 'Nunca mostramos casos individuales ni coordenadas personales.'],
              ['Limite geografico', 'El RNPDNO publica municipio, no ubicacion exacta; por eso el mapa agrupa y aproxima.'],
              ['Privacidad primero', 'Cuando una zona tiene pocos casos, debe generalizarse para evitar reidentificacion.'],
              ['Trazabilidad', 'Cada actualizacion conserva fecha y fuente para poder auditar los numeros.'],
            ].map(([paso, texto]) => (
              <div key={paso} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ember-mid)', marginBottom: 4 }}>{paso}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{texto}</div>
              </div>
            ))}
            <button onClick={() => setPanelMetodologia(false)} style={{ marginTop: 6, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      ) : null}

      {cargando ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'Inter', color: 'var(--text-muted)', fontSize: 14 }}>
          Cargando el mapa...
        </div>
      ) : null}

      {iframeCompleto ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'var(--bg)', display: 'flex', flexDirection: 'column', borderTop: '3px solid var(--ember-mid)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="brand-title" style={{ fontSize: 16, color: 'var(--ember-mid)' }}>Brujula</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>viendo Consulta Publica RNPDNO</span>
            </div>
            <button onClick={() => setIframeCompleto(false)} style={{ border: 'none', background: 'var(--ember-mid)', color: '#1a1108', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Volver al mapa</button>
          </div>
          <iframe src={FUENTE_RNPDNO} title="Consulta Publica RNPDNO en vivo, pantalla completa" style={{ flex: 1, width: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups" />
        </div>
      ) : null}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 60px 10px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'rgba(240,237,228,0.85)', background: 'rgba(10,15,28,0.85)', borderTop: '1px solid var(--line)', backdropFilter: 'blur(8px)', opacity: cargando ? 0 : 1, transition: 'opacity 700ms ease 500ms', pointerEvents: cargando ? 'none' : 'auto' }}>
        <span>Datos: RNPDNO. Proyecto civil independiente, sin afiliacion gubernamental.</span>
        <span style={{ opacity: 0.4 }}>-</span>
        <a href="https://affine.com.mx" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ember-mid)', textDecoration: 'none', flexShrink: 0, fontWeight: 700 }}>Un proyecto de Affine</a>
      </div>
    </div>
  );
}
