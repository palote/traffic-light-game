import { useState, useEffect } from 'react';
import './ABTestDashboard.css';

interface MetricaVersion {
  version: string;
  sesiones: number;
  usuariosUnicos: number;
  engagementRate: number;
  tiempoPromedio: number;
  bounceRate: number;
  paginasPorSesion: number;
  eventosPorSesion: number;
  eventosTotal: number;
  porMateria: { [materia: string]: number };
  enviados?: number;
  lista?: string;
}

interface DatosEnvio {
  version: string;
  lista: string;
  enviados: number;
}

const CLOUD_FUNCTION_URL = 'https://getmetricsga4-cgjxsgll7a-uc.a.run.app';

export function ABTestDashboard() {
  const [metricas, setMetricas] = useState<MetricaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [fuenteDatos, setFuenteDatos] = useState<'ga4' | 'mock'>('mock');

  const datosEnvios: DatosEnvio[] = [
    { version: 'v1', lista: 'historia_geografia', enviados: 294 },
    { version: 'v2', lista: 'biologia_matematica', enviados: 285 },
    { version: 'v3', lista: 'idiomas', enviados: 280 },
  ];

  const datosMock: MetricaVersion[] = [
    {
      version: 'v1', sesiones: 45, usuariosUnicos: 42,
      engagementRate: 0.91, tiempoPromedio: 28,
      bounceRate: 0.35, paginasPorSesion: 2.3, eventosPorSesion: 1.8, eventosTotal: 81,
      porMateria: { Historia: 28, Geografia: 17 },
    },
    {
      version: 'v2', sesiones: 38, usuariosUnicos: 35,
      engagementRate: 0.87, tiempoPromedio: 25,
      bounceRate: 0.42, paginasPorSesion: 1.9, eventosPorSesion: 1.5, eventosTotal: 57,
      porMateria: { Matematica: 22, Biologia: 16 },
    },
    {
      version: 'v3', sesiones: 52, usuariosUnicos: 48,
      engagementRate: 0.94, tiempoPromedio: 32,
      bounceRate: 0.28, paginasPorSesion: 2.7, eventosPorSesion: 2.1, eventosTotal: 109,
      porMateria: { Ingles: 28, Frances: 15, Italiano: 6, Portugues: 3 },
    },
  ];

  const usarDatosMock = () => { setMetricas(datosMock); setFuenteDatos('mock'); };

  const fetchMetricas = async () => {
    setLoading(true);
    try {
      const response = await fetch(CLOUD_FUNCTION_URL);
      if (response.ok) {
        const data: MetricaVersion[] = await response.json();
        setMetricas(data);
        setFuenteDatos('ga4');
      } else {
        usarDatosMock();
      }
    } catch {
      usarDatosMock();
    } finally {
      setUltimaActualizacion(new Date());
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetricas(); }, []);

  const getEnviados = (m: MetricaVersion) =>
    m.enviados ?? datosEnvios.find(d => d.version === m.version)?.enviados ?? 1;

  const calcularCTR = (m: MetricaVersion) =>
    ((m.sesiones / getEnviados(m)) * 100).toFixed(1);

  const getNombreVersion = (version: string) =>
    ({ v1: 'Historia / Geografia - Control', v2: 'Biologia / Matematica - Conceptual', v3: 'Idiomas - Pregunta' }[version] ?? version);

  const getColor = (version: string) =>
    ({ v1: '#3b82f6', v2: '#10b981', v3: '#f59e0b' }[version] ?? '#6b7280');

  const getTotalSesiones = () => metricas.reduce((a, m) => a + m.sesiones, 0);
  const getTotalEnviados = () => metricas.reduce((a, m) => a + getEnviados(m), 0);

  const ganadorCTR = metricas.length ? metricas.reduce((b, m) => parseFloat(calcularCTR(m)) > parseFloat(calcularCTR(b)) ? m : b) : null;
  const ganadorEng = metricas.length ? metricas.reduce((b, m) => m.engagementRate > b.engagementRate ? m : b) : null;
  const ganadorReb = metricas.length ? metricas.reduce((b, m) => m.bounceRate < b.bounceRate ? m : b) : null;
  const ganadorTie = metricas.length ? metricas.reduce((b, m) => m.tiempoPromedio > b.tiempoPromedio ? m : b) : null;

  if (loading) {
    return (
      <div className="abtest-loading">
        <div className="abtest-spinner">⏳</div>
        <p>Cargando metricas...</p>
      </div>
    );
  }

  return (
    <div className="abtest-dashboard">
      <div className="abtest-header">
        <div>
          <h1 className="abtest-title">A/B Test — Campana <code>arbitro_2026</code></h1>
          {ultimaActualizacion && (
            <p className="abtest-subtitle">
              {fuenteDatos === 'ga4' ? 'Datos reales de GA4' : 'Datos mock (GA4 no disponible)'}
              {' — '}Actualizado: {ultimaActualizacion.toLocaleTimeString('es-AR')}
            </p>
          )}
        </div>
        <button className="abtest-refresh-btn" onClick={fetchMetricas}>Actualizar</button>
      </div>

      <div className="abtest-summary">
        <div className="summary-box">
          <div className="summary-value">{getTotalSesiones()}</div>
          <div className="summary-label">Sesiones totales</div>
        </div>
        <div className="summary-box">
          <div className="summary-value">{getTotalEnviados()}</div>
          <div className="summary-label">Emails enviados</div>
        </div>
        <div className="summary-box">
          <div className="summary-value">
            {getTotalEnviados() > 0 ? ((getTotalSesiones() / getTotalEnviados()) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="summary-label">CTR global</div>
        </div>
        {ganadorCTR && (
          <div className="summary-box summary-winner">
            <div className="summary-value">{ganadorCTR.version.toUpperCase()}</div>
            <div className="summary-label">Mejor CTR</div>
          </div>
        )}
      </div>

      {metricas.map((metrica) => {
        const ctr = calcularCTR(metrica);
        const color = getColor(metrica.version);
        return (
          <div key={metrica.version} className="version-card" style={{ borderLeftColor: color }}>
            <div className="version-card-header">
              <h2 className="version-title" style={{ color }}>{metrica.version.toUpperCase()}</h2>
              <span className="version-subtitle">{getNombreVersion(metrica.version)}</span>
            </div>
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-value" style={{ color }}>{metrica.sesiones}</div>
                <div className="metric-label">sesiones — {metrica.usuariosUnicos} usuarios unicos</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: '#10b981' }}>{ctr}%</div>
                <div className="metric-label">CTR ({metrica.sesiones} / {getEnviados(metrica)} enviados)</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: '#f59e0b' }}>{(metrica.engagementRate * 100).toFixed(0)}%</div>
                <div className="metric-label">engagement — {metrica.tiempoPromedio}s promedio</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: '#ef4444' }}>{(metrica.bounceRate * 100).toFixed(1)}%</div>
                <div className="metric-label">tasa de rebote</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: '#8b5cf6' }}>{metrica.paginasPorSesion.toFixed(1)}</div>
                <div className="metric-label">paginas por sesion</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: '#06b6d4' }}>{metrica.eventosPorSesion.toFixed(1)}</div>
                <div className="metric-label">eventos / sesion — {metrica.eventosTotal} total</div>
              </div>
            </div>
            <div className="materia-breakdown">
              <strong>Por materia:</strong>
              <div className="materia-tags">
                {Object.entries(metrica.porMateria).map(([materia, count]) => (
                  <span key={materia} className="materia-tag">{materia} <strong>{count}</strong></span>
                ))}
              </div>
            </div>
            <div className="ctr-bar-container">
              <div className="ctr-bar" style={{ width: `${Math.min(parseFloat(ctr) * 5, 100)}%`, backgroundColor: color }} />
              <span className="ctr-bar-label">{ctr}% CTR</span>
            </div>
          </div>
        );
      })}

      {metricas.length > 0 && (
        <div className="comparativo-card">
          <h2 className="comparativo-title">Analisis Comparativo</h2>
          <div className="comparativo-grid">
            <div className="comparativo-box">
              <span className="comparativo-label">Mejor CTR</span>
              <span className="comparativo-winner">{ganadorCTR?.version.toUpperCase()} — {calcularCTR(ganadorCTR!)}%</span>
            </div>
            <div className="comparativo-box">
              <span className="comparativo-label">Mejor Engagement</span>
              <span className="comparativo-winner">{ganadorEng?.version.toUpperCase()} — {((ganadorEng?.engagementRate ?? 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="comparativo-box">
              <span className="comparativo-label">Menor Rebote</span>
              <span className="comparativo-winner">{ganadorReb?.version.toUpperCase()} — {((ganadorReb?.bounceRate ?? 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="comparativo-box">
              <span className="comparativo-label">Mayor Tiempo</span>
              <span className="comparativo-winner">{ganadorTie?.version.toUpperCase()} — {ganadorTie?.tiempoPromedio}s</span>
            </div>
          </div>
        </div>
      )}

      <div className="abtest-footer">
        <strong>Nota:</strong> Envios hardcodeados (v1: 294 — v2: 285 — v3: 280).
        UTMs: <code>utm_campaign=arbitro_2026</code> — <code>utm_content=v1_sociales | v2_exactas | v3_lenguajes</code>
      </div>
    </div>
  );
}
