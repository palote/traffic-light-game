// src/components/setup/StudentProposalSetup.tsx
// Configuración del juego cuando los alumnos proponen las consignas

import { useState, useRef } from "react";
import { useGameMode } from "../../contexts/GameModeContext";
import { useI18n } from "../../i18n";

// Tipos
interface MaterialItem {
  id: string;
  type: 'file' | 'text' | 'link';
  name: string;
  content: string;
}

export interface ProposalGameConfig {
  gameName: string;
  subject: string;
  numberOfTeams: number;
  materials: MaterialItem[];
  maxProposalsPerTeam: number;
  timerMinutes: number | null; // null = sin límite
  showLiveProposals: boolean; // mostrar propuestas en vivo en pantalla del aula
}

interface StudentProposalSetupProps {
  onComplete: (config: ProposalGameConfig) => void;
  onBack: () => void;
}

export function StudentProposalSetup({ onComplete, onBack }: StudentProposalSetupProps) {
  const { theme } = useGameMode();
  const { language } = useI18n();
  
  // Estado del formulario
  const [step, setStep] = useState<1 | 2>(1);
  const [gameName, setGameName] = useState('');
  const [subject, setSubject] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  
  // Materiales
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Configuración de propuestas
  const [maxProposalsPerTeam, setMaxProposalsPerTeam] = useState(10);
  const [useTimer, setUseTimer] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [showLiveProposals, setShowLiveProposals] = useState(false);

  // Traducciones
  const t = {
    step1Title: language === 'es' ? 'Configuración básica' : 'Basic configuration',
    step2Title: language === 'es' ? 'Configuración de propuestas' : 'Proposal settings',
    
    gameName: language === 'es' ? 'Nombre del juego' : 'Game name',
    gameNamePlaceholder: language === 'es' ? 'Ej: Repaso Unidad 3 - Célula' : 'E.g.: Unit 3 Review - Cell',
    subject: language === 'es' ? 'Tema/Materia' : 'Subject/Topic',
    subjectPlaceholder: language === 'es' ? 'Ej: Biología, Ciencias Naturales' : 'E.g.: Biology, Natural Sciences',
    numberOfTeams: language === 'es' ? 'Cantidad de equipos' : 'Number of teams',
    
    materials: language === 'es' ? 'Material de referencia' : 'Reference material',
    materialsDesc: language === 'es' 
      ? 'Agregá el material que los equipos usarán para crear las consignas (opcional)'
      : 'Add the material teams will use to create questions (optional)',
    addFile: language === 'es' ? 'Subir archivo' : 'Upload file',
    addText: language === 'es' ? 'Agregar texto' : 'Add text',
    addLink: language === 'es' ? 'Agregar link' : 'Add link',
    
    textTitle: language === 'es' ? 'Título del texto' : 'Text title',
    textContent: language === 'es' ? 'Contenido' : 'Content',
    linkTitle: language === 'es' ? 'Título del enlace' : 'Link title',
    linkUrl: language === 'es' ? 'URL' : 'URL',
    add: language === 'es' ? 'Agregar' : 'Add',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    
    proposalsPerTeam: language === 'es' ? 'Espacios por equipo' : 'Slots per team',
    proposalsPerTeamDesc: language === 'es' 
      ? 'Cada equipo puede enviar hasta esta cantidad de propuestas'
      : 'Each team can submit up to this many proposals',
    
    timeLimit: language === 'es' ? 'Tiempo límite' : 'Time limit',
    noTimeLimit: language === 'es' ? 'Sin límite (cierro manualmente)' : 'No limit (I close manually)',
    withTimeLimit: language === 'es' ? 'Con límite:' : 'With limit:',
    minutes: language === 'es' ? 'minutos' : 'minutes',
    
    showLiveProposals: language === 'es' 
      ? 'Mostrar propuestas en tiempo real en la pantalla del aula'
      : 'Show proposals in real-time on classroom screen',
    showLiveProposalsDesc: language === 'es'
      ? 'Los equipos verán cuántas propuestas envió cada equipo'
      : 'Teams will see how many proposals each team submitted',
    
    tipTitle: language === 'es' ? '💡 Recordá' : '💡 Remember',
    tipContent: language === 'es'
      ? 'Buscamos consignas variadas: preguntas de comprensión, consignas que pidan relacionar ideas, actividades que impliquen explicar o justificar. Para la Etapa 2, priorizá las que requieran comprensión más profunda.'
      : 'We\'re looking for varied questions: comprehension questions, prompts that ask to relate ideas, activities that require explaining or justifying. For Stage 2, prioritize those requiring deeper understanding.',
    
    back: language === 'es' ? '← Volver' : '← Back',
    next: language === 'es' ? 'Siguiente →' : 'Next →',
    createRoom: language === 'es' ? 'Crear sala →' : 'Create room →',
  };

  // Handlers de materiales
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const newMaterial: MaterialItem = {
        id: Date.now().toString(),
        type: 'file',
        name: file.name,
        content: reader.result as string,
      };
      setMaterials(prev => [...prev, newMaterial]);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddText = () => {
    if (!textContent.trim()) return;
    
    const newMaterial: MaterialItem = {
      id: Date.now().toString(),
      type: 'text',
      name: textTitle.trim() || 'Texto',
      content: textContent.trim(),
    };
    setMaterials(prev => [...prev, newMaterial]);
    setTextContent('');
    setTextTitle('');
    setShowTextInput(false);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    
    const newMaterial: MaterialItem = {
      id: Date.now().toString(),
      type: 'link',
      name: linkTitle.trim() || linkUrl.trim(),
      content: linkUrl.trim(),
    };
    setMaterials(prev => [...prev, newMaterial]);
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleComplete = () => {
    const config: ProposalGameConfig = {
      gameName: gameName.trim() || 'Juego colaborativo',
      subject: subject.trim(),
      numberOfTeams,
      materials,
      maxProposalsPerTeam,
      timerMinutes: useTimer ? timerMinutes : null,
      showLiveProposals,
    };
    onComplete(config);
  };

  const canProceedStep1 = gameName.trim().length > 0;
  const canProceedStep2 = true; // Siempre puede proceder en step 2

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: '#e2e8f0',
            color: '#475569',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {t.back}
        </button>
        
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            👥 {language === 'es' ? 'Los equipos proponen' : 'Teams propose'}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            {step === 1 ? t.step1Title : t.step2Title}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto 24px',
        display: 'flex',
        gap: 8,
      }}>
        {[1, 2].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: s <= step ? '#8b5cf6' : '#e2e8f0',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}>
        {step === 1 ? (
          /* STEP 1: Configuración básica */
          <div>
            {/* Nombre del juego */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                {t.gameName} *
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={t.gameNamePlaceholder}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e2e8f0',
                  borderRadius: 10,
                  outline: 'none',
                }}
              />
            </div>

            {/* Tema/Materia */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                {t.subject}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t.subjectPlaceholder}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e2e8f0',
                  borderRadius: 10,
                  outline: 'none',
                }}
              />
            </div>

            {/* Cantidad de equipos */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                {t.numberOfTeams}
              </label>
              <select
                value={numberOfTeams}
                onChange={(e) => setNumberOfTeams(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e2e8f0',
                  borderRadius: 10,
                  outline: 'none',
                  backgroundColor: 'white',
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} {language === 'es' ? 'equipos' : 'teams'}</option>
                ))}
              </select>
            </div>

            {/* Materiales */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                {t.materials}
              </label>
              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#64748b' }}>
                {t.materialsDesc}
              </p>

              {/* Lista de materiales */}
              {materials.length > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {materials.map(m => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        backgroundColor: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>
                        {m.type === 'file' ? '📄' : m.type === 'link' ? '🔗' : '📝'}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{m.name}</span>
                      <button
                        onClick={() => handleRemoveMaterial(m.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          backgroundColor: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botones para agregar */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#f0f9ff',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  📄 {t.addFile}
                </button>
                <button
                  onClick={() => setShowTextInput(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  📝 {t.addText}
                </button>
                <button
                  onClick={() => setShowLinkInput(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  🔗 {t.addLink}
                </button>
              </div>

              {/* Input de texto */}
              {showTextInput && (
                <div style={{ marginTop: 12, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder={t.textTitle}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 14,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder={t.textContent}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 14,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      resize: 'vertical',
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddText} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {t.add}
                    </button>
                    <button onClick={() => { setShowTextInput(false); setTextContent(''); setTextTitle(''); }} style={{ padding: '8px 16px', fontSize: 13, backgroundColor: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}

              {/* Input de link */}
              {showLinkInput && (
                <div style={{ marginTop: 12, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder={t.linkTitle}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 14,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 14,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddLink} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {t.add}
                    </button>
                    <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkTitle(''); }} style={{ padding: '8px 16px', fontSize: 13, backgroundColor: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón siguiente */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                style={{
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  backgroundColor: canProceedStep1 ? '#8b5cf6' : '#e2e8f0',
                  color: canProceedStep1 ? 'white' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                }}
              >
                {t.next}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Configuración de propuestas */
          <div>
            {/* Espacios por equipo */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                {t.proposalsPerTeam}
              </label>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#64748b' }}>
                {t.proposalsPerTeamDesc}
              </p>
              <select
                value={maxProposalsPerTeam}
                onChange={(e) => setMaxProposalsPerTeam(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '2px solid #e2e8f0',
                  borderRadius: 10,
                  backgroundColor: 'white',
                }}
              >
                {[5, 8, 10, 12, 15, 20].map(n => (
                  <option key={n} value={n}>{n} {language === 'es' ? 'propuestas' : 'proposals'}</option>
                ))}
              </select>
            </div>

            {/* Tiempo límite */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                {t.timeLimit}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={!useTimer}
                    onChange={() => setUseTimer(false)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14, color: '#475569' }}>{t.noTimeLimit}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={useTimer}
                    onChange={() => setUseTimer(true)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14, color: '#475569' }}>{t.withTimeLimit}</span>
                  {useTimer && (
                    <select
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        fontSize: 14,
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        backgroundColor: 'white',
                      }}
                    >
                      {[5, 10, 15, 20, 25, 30].map(n => (
                        <option key={n} value={n}>{n} {t.minutes}</option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
            </div>

            {/* Mostrar propuestas en vivo */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                cursor: 'pointer',
                padding: 16,
                backgroundColor: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}>
                <input
                  type="checkbox"
                  checked={showLiveProposals}
                  onChange={(e) => setShowLiveProposals(e.target.checked)}
                  style={{ width: 20, height: 20, marginTop: 2 }}
                />
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {t.showLiveProposals}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                    {t.showLiveProposalsDesc}
                  </p>
                </div>
              </label>
            </div>

            {/* Tip */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#fef3c7',
              borderRadius: 10,
              border: '1px solid #fbbf24',
              marginBottom: 32,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
                {t.tipTitle}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                {t.tipContent}
              </p>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                {t.back}
              </button>
              <button
                onClick={handleComplete}
                style={{
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                {t.createRoom}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}