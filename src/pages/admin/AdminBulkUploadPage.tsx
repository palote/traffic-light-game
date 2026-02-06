// src/pages/admin/AdminBulkUploadPage.tsx
// Página para subir múltiples items a la biblioteca desde una tabla

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { 
  NewCSVLibraryItem, 
  LibraryGameMode, 
  PrimaryGrade, 
  Area, 
  Subject, 
  LibraryLanguage,
  SecondaryLevel 
} from '../../types/library';
import { SUBJECT_TO_AREA } from '../../types/library';
import { uploadLibraryMetadataOnly } from '../../services/libraryService';

// ============================================
// PARSER DE TABLA
// ============================================

interface ParsedRow {
  nivel: string;
  materia: string;
  idioma: string;
  nombreArchivo: string;
  tema: string;
  contenidos: string;
  habilidades: string;
  isValid: boolean;
  error?: string;
}

function parseTableData(text: string, gameMode: LibraryGameMode): ParsedRow[] {
  const lines = text.trim().split('\n');
  const rows: ParsedRow[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Saltar líneas vacías o encabezados
    if (!line || line.startsWith('Nivel') || line.startsWith('nivel')) {
      continue;
    }
    
    // Separar por tabs
    const parts = line.split('\t');
    
    // Necesitamos al menos 7 columnas
    if (parts.length < 7) {
      // Podría ser una línea vacía con solo tabs
      if (parts.every(p => !p.trim())) continue;
      
      rows.push({
        nivel: parts[0] || '',
        materia: parts[1] || '',
        idioma: parts[2] || '',
        nombreArchivo: parts[3] || '',
        tema: parts[4] || '',
        contenidos: parts[5] || '',
        habilidades: parts[6] || '',
        isValid: false,
        error: `Fila incompleta (${parts.length} columnas, se necesitan 7)`,
      });
      continue;
    }
    
    const [nivel, materia, idioma, nombreArchivo, tema, contenidos, habilidades] = parts;
    
    // Validar que tenga los campos principales
    if (!nombreArchivo?.trim() || !tema?.trim()) {
      continue; // Saltar filas sin nombre de archivo o tema
    }
    
    rows.push({
      nivel: nivel?.trim() || '',
      materia: materia?.trim() || '',
      idioma: idioma?.trim() || '',
      nombreArchivo: nombreArchivo?.trim() || '',
      tema: tema?.trim() || '',
      contenidos: contenidos?.trim() || '',
      habilidades: habilidades?.trim() || '',
      isValid: true,
    });
  }
  
  return rows;
}

function convertToLibraryItem(row: ParsedRow, gameMode: LibraryGameMode): NewCSVLibraryItem | null {
  if (!row.isValid || !row.nombreArchivo) return null;
  
  // CAMBIO 1: Determinar idioma - Ahora incluye Portugués
  const idiomaLower = row.idioma.toLowerCase();
  let language: LibraryLanguage = 'es'; // valor por defecto
  
  if (idiomaLower.includes('inglés') || idiomaLower.includes('english') || idiomaLower === 'en') {
    language = 'en';
  } else if (idiomaLower.includes('português') || idiomaLower.includes('portugués') || idiomaLower.includes('portuguese') || idiomaLower === 'pt') {
    language = 'pt';
  }
  
  // Determinar materia/área
  let area: Area;
  let subject: Subject | undefined;
  
  const materiaLower = row.materia.toLowerCase();
  
  if (gameMode === 'coopetition') {
    // CAMBIO 2: Para Coopetition, mapear materia específica - Incluye Portugués
    if (materiaLower.includes('biología') || materiaLower.includes('biology') || materiaLower.includes('biologia')) {
      subject = language === 'es' ? 'Biología' : language === 'pt' ? 'Biologia' : 'Biology';
    } else if (materiaLower.includes('química') || materiaLower.includes('chemistry') || materiaLower.includes('química')) {
      subject = language === 'es' ? 'Química' : language === 'pt' ? 'Química' : 'Chemistry';
    } else if (materiaLower.includes('física') || materiaLower.includes('physics') || materiaLower.includes('física')) {
      subject = language === 'es' ? 'Física' : language === 'pt' ? 'Física' : 'Physics';
    } else if (materiaLower.includes('historia') || materiaLower.includes('history') || materiaLower.includes('história')) {
      subject = language === 'es' ? 'Historia' : language === 'pt' ? 'História' : 'History';
    } else if (materiaLower.includes('geografía') || materiaLower.includes('geography') || materiaLower.includes('geografia')) {
      subject = language === 'es' ? 'Geografía' : language === 'pt' ? 'Geografia' : 'Geography';
    } else if (materiaLower.includes('economía') || materiaLower.includes('economics') || materiaLower.includes('economia')) {
      subject = language === 'es' ? 'Economía' : language === 'pt' ? 'Economia' : 'Economics';
    } else if (materiaLower.includes('lengua') || materiaLower.includes('language') || materiaLower.includes('língua')) {
      subject = language === 'es' ? 'Lengua' : language === 'pt' ? 'Língua Portuguesa' : 'Language Arts';
    } else if (materiaLower.includes('matemática') || materiaLower.includes('math') || materiaLower.includes('matemática')) {
      subject = language === 'es' ? 'Matemática' : language === 'pt' ? 'Matemática' : 'Mathematics';
    }
    
    area = subject ? SUBJECT_TO_AREA[subject] : (language === 'es' ? 'Lengua' : language === 'pt' ? 'Língua Portuguesa' : 'Language Arts');
  } else {
    // CAMBIO 3: Para Traffic Light, solo área - Incluye Portugués
    if (materiaLower.includes('ciencias naturales') || materiaLower.includes('science') || materiaLower.includes('natural') || materiaLower.includes('ciências da natureza')) {
      area = language === 'es' ? 'Ciencias Naturales' : language === 'pt' ? 'Ciências da Natureza' : 'Natural Sciences';
    } else if (materiaLower.includes('ciencias sociales') || materiaLower.includes('social') || materiaLower.includes('ciências humanas')) {
      area = language === 'es' ? 'Ciencias Sociales' : language === 'pt' ? 'Ciências Humanas' : 'Social Studies';
    } else if (materiaLower.includes('matemática') || materiaLower.includes('math') || materiaLower.includes('matemática')) {
      area = language === 'es' ? 'Matemática' : language === 'pt' ? 'Matemática' : 'Mathematics';
    } else if (materiaLower.includes('língua') || materiaLower.includes('língua portuguesa')) {
      area = language === 'pt' ? 'Língua Portuguesa' : language === 'es' ? 'Lengua' : 'Language Arts';
    } else {
      area = language === 'es' ? 'Lengua' : language === 'pt' ? 'Língua Portuguesa' : 'Language Arts';
    }
  }
  
  // Determinar grado (solo para Traffic Light)
  let grade: PrimaryGrade | undefined;
  if (gameMode === 'traffic-light') {
    const nivelLower = row.nivel.toLowerCase();
    if (nivelLower.includes('3')) grade = '3°';
    else if (nivelLower.includes('4')) grade = '4°';
    else if (nivelLower.includes('5')) grade = '5°';
    else if (nivelLower.includes('6')) grade = '6°';
    else if (nivelLower.includes('7')) grade = '7°';
  }
  
  // Crear título desde nombre de archivo
  const title = row.nombreArchivo.replace('.csv', '').replace(/_/g, ' ');
  
  const item: NewCSVLibraryItem = {
    gameMode,
    language,
    area,
    title,
    fileName: row.nombreArchivo,
    topic: row.tema,
    mainContents: row.contenidos,
    mainSkills: row.habilidades,
    storagePath: '', // Se llenará cuando se suba el archivo
  };
  
  if (gameMode === 'traffic-light' && grade) {
    item.grade = grade;
  }
  
  if (gameMode === 'coopetition') {
    item.level = 'secondary' as SecondaryLevel;
    if (subject) {
      item.subject = subject;
    }
  }
  
  return item;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AdminBulkUploadPage() {
  const navigate = useNavigate();
  
  const [gameMode, setGameMode] = useState<LibraryGameMode>('traffic-light');
  const [tableText, setTableText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [convertedItems, setConvertedItems] = useState<NewCSVLibraryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);
  
  const handleParse = () => {
    const rows = parseTableData(tableText, gameMode);
    setParsedRows(rows);
    
    const items = rows
      .map(row => convertToLibraryItem(row, gameMode))
      .filter((item): item is NewCSVLibraryItem => item !== null);
    
    setConvertedItems(items);
    setUploadResult(null);
  };
  
  const handleUpload = async () => {
    if (convertedItems.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < convertedItems.length; i++) {
      try {
        await uploadLibraryMetadataOnly(convertedItems[i]);
        success++;
      } catch (e) {
        console.error('Error uploading item:', convertedItems[i].title, e);
        failed++;
      }
      
      setUploadProgress(Math.round(((i + 1) / convertedItems.length) * 100));
    }
    
    setUploadResult({ success, failed });
    setIsUploading(false);
  };
  
  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: 24,
    },
    container: {
      maxWidth: 1200,
      margin: '0 auto',
    },
    header: {
      marginBottom: 32,
    },
    backBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      backgroundColor: '#f1f5f9',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 14,
      color: '#64748b',
      marginBottom: 16,
    },
    title: {
      margin: 0,
      fontSize: 28,
      fontWeight: 800,
      color: '#1e293b',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      marginBottom: 24,
    },
    label: {
      display: 'block',
      marginBottom: 8,
      fontSize: 14,
      fontWeight: 600,
      color: '#475569',
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      fontSize: 14,
      borderRadius: 8,
      border: '2px solid #e2e8f0',
      marginBottom: 16,
    },
    textarea: {
      width: '100%',
      minHeight: 200,
      padding: 16,
      fontSize: 13,
      fontFamily: 'monospace',
      borderRadius: 8,
      border: '2px solid #e2e8f0',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    btn: {
      padding: '12px 24px',
      fontSize: 14,
      fontWeight: 600,
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      marginRight: 12,
    },
    btnPrimary: {
      backgroundColor: '#6366f1',
      color: 'white',
    },
    btnSuccess: {
      backgroundColor: '#22c55e',
      color: 'white',
    },
    btnDisabled: {
      backgroundColor: '#cbd5e1',
      color: '#94a3b8',
      cursor: 'not-allowed',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: 13,
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px 8px',
      borderBottom: '2px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      fontWeight: 600,
      color: '#475569',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #f1f5f9',
      color: '#334155',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
    },
    progress: {
      width: '100%',
      height: 8,
      backgroundColor: '#e2e8f0',
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 16,
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#22c55e',
      transition: 'width 0.3s',
    },
  };
  
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/admin/metrics')}>
            ← Volver al panel
          </button>
          <h1 style={styles.title}>📦 Bulk Upload - Biblioteca</h1>
        </div>
        
        {/* Paso 1: Seleccionar modo y pegar tabla */}
        <div style={styles.card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#1e293b' }}>
            1. Seleccionar juego y pegar tabla
          </h2>
          
          <label style={styles.label}>Juego destino:</label>
          <select 
            style={styles.select} 
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as LibraryGameMode)}
          >
            <option value="traffic-light">🚦 Traffic Light Game (Primaria)</option>
            <option value="coopetition">🎯 Coopetition Game (Secundario)</option>
          </select>
          
          <label style={styles.label}>
            Pegá la tabla (formato: Nivel | Materia | Idioma | Archivo | Tema | Contenidos | Habilidades):
          </label>
          <textarea
            style={styles.textarea}
            value={tableText}
            onChange={(e) => setTableText(e.target.value)}
            placeholder="3° Primaria&#9;Lengua&#9;Español&#9;Lengua_3ro_Comprension.csv&#9;Comprensión de textos&#9;Lectura literal&#9;Localizar información"
          />
          
          <button 
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleParse}
            disabled={!tableText.trim()}
          >
            🔍 Parsear tabla
          </button>
        </div>
        
        {/* Paso 2: Preview */}
        {parsedRows.length > 0 && (
          <div style={styles.card}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#1e293b' }}>
              2. Preview ({convertedItems.length} items válidos de {parsedRows.length} filas)
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Archivo</th>
                    <th style={styles.th}>Tema</th>
                    <th style={styles.th}>Área</th>
                    {gameMode === 'coopetition' && <th style={styles.th}>Materia</th>}
                    {gameMode === 'traffic-light' && <th style={styles.th}>Grado</th>}
                    <th style={styles.th}>Idioma</th>
                  </tr>
                </thead>
                <tbody>
                  {convertedItems.slice(0, 50).map((item, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={styles.td}>{item.fileName}</td>
                      <td style={styles.td}>{item.topic}</td>
                      <td style={styles.td}>
                        <span style={{ 
                          ...styles.badge, 
                          backgroundColor: '#dbeafe', 
                          color: '#1d4ed8' 
                        }}>
                          {item.area}
                        </span>
                      </td>
                      {gameMode === 'coopetition' && (
                        <td style={styles.td}>
                          <span style={{ 
                            ...styles.badge, 
                            backgroundColor: '#f3e8ff', 
                            color: '#7c3aed' 
                          }}>
                            {item.subject || '-'}
                          </span>
                        </td>
                      )}
                      {gameMode === 'traffic-light' && (
                        <td style={styles.td}>
                          <span style={{ 
                            ...styles.badge, 
                            backgroundColor: '#dcfce7', 
                            color: '#16a34a' 
                          }}>
                            {item.grade || '-'}
                          </span>
                        </td>
                      )}
                      <td style={styles.td}>
                        {/* CAMBIO 4: Ahora incluye Portugués */}
                        <span style={{ 
                          ...styles.badge, 
                          backgroundColor: item.language === 'es' ? '#fef3c7' : item.language === 'pt' ? '#dcfce7' : '#cffafe', 
                          color: item.language === 'es' ? '#b45309' : item.language === 'pt' ? '#16a34a' : '#0891b2' 
                        }}>
                          {item.language === 'es' ? '🇪🇸 ES' : item.language === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {convertedItems.length > 50 && (
                <p style={{ marginTop: 16, color: '#64748b', fontSize: 13 }}>
                  ... y {convertedItems.length - 50} items más
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Paso 3: Subir */}
        {convertedItems.length > 0 && (
          <div style={styles.card}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: '#1e293b' }}>
              3. Subir metadata a Firebase
            </h2>
            
            <p style={{ marginBottom: 16, color: '#64748b', fontSize: 14 }}>
              Esto subirá solo la <strong>metadata</strong> (info de las tarjetas). 
              Los archivos CSV se pueden vincular después desde el panel de administración.
            </p>
            
            <button 
              style={{ 
                ...styles.btn, 
                ...(isUploading || convertedItems.length === 0 ? styles.btnDisabled : styles.btnSuccess)
              }}
              onClick={handleUpload}
              disabled={isUploading || convertedItems.length === 0}
            >
              {isUploading ? `Subiendo... ${uploadProgress}%` : `🚀 Subir ${convertedItems.length} items`}
            </button>
            
            {isUploading && (
              <div style={styles.progress}>
                <div style={{ ...styles.progressBar, width: `${uploadProgress}%` }} />
              </div>
            )}
            
            {uploadResult && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                borderRadius: 8,
                backgroundColor: uploadResult.failed === 0 ? '#dcfce7' : '#fef3c7',
                color: uploadResult.failed === 0 ? '#16a34a' : '#b45309',
              }}>
                ✅ Subidos: {uploadResult.success} | ❌ Fallidos: {uploadResult.failed}
              </div>
            )}
          </div>
        )}
        
        {/* Instrucciones */}
        <div style={{ ...styles.card, backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#475569' }}>
            📋 Instrucciones
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>
            <li>Copiá la tabla desde Excel/Google Sheets (debe tener 7 columnas separadas por TAB)</li>
            <li>Seleccioná el juego destino (Traffic Light o Coopetition)</li>
            <li>Pegá la tabla en el área de texto</li>
            <li>Hacé clic en "Parsear tabla" para ver el preview</li>
            <li>Verificá que los datos se parsearon correctamente</li>
            <li>Hacé clic en "Subir" para guardar en Firebase</li>
            <li>Después podés vincular los archivos CSV desde el panel de administración</li>
          </ol>
        </div>
      </div>
    </div>
  );
}