// src/components/library/ReportGameModal.tsx
// Modal para reportar un juego de la comunidad

import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { TeacherGame, ReportReason } from '../../types/teacherLibrary';

interface ReportGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: TeacherGame;
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
}

const REPORT_REASONS: { value: ReportReason; labelEs: string; labelEn: string; icon: string }[] = [
  { value: 'inappropriate', labelEs: 'Contenido inapropiado', labelEn: 'Inappropriate content', icon: '🚫' },
  { value: 'incorrect', labelEs: 'Información incorrecta', labelEn: 'Incorrect information', icon: '❌' },
  { value: 'spam', labelEs: 'Spam o promoción', labelEn: 'Spam or promotion', icon: '📢' },
  { value: 'copyright', labelEs: 'Violación de copyright', labelEn: 'Copyright violation', icon: '©️' },
  { value: 'other', labelEs: 'Otro motivo', labelEn: 'Other reason', icon: '❓' },
];

export function ReportGameModal({
  isOpen,
  onClose,
  game,
  onSubmit,
}: ReportGameModalProps) {
  const { t, language } = useI18n();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      setError(language === 'es' ? 'Seleccioná un motivo' : 'Select a reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(reason, details.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 40,
          textAlign: 'center',
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
            {language === 'es' ? '¡Reporte enviado!' : 'Report submitted!'}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            {t.teacherLibrary.reportSubmitted}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 20,
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            🚩 {t.teacherLibrary.reportGame}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: 36,
              height: 36,
              borderRadius: '50%',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Game info */}
          <div style={{
            padding: 12,
            backgroundColor: '#f8fafc',
            borderRadius: 10,
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              {game.title}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {t.teacherLibrary.by} {game.ownerName}
            </div>
          </div>

          {/* Reason selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#475569',
            }}>
              {t.teacherLibrary.reportReason} *
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: reason === r.value ? '2px solid #ef4444' : '2px solid #e2e8f0',
                    backgroundColor: reason === r.value ? '#fef2f2' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{
                    fontWeight: 500,
                    color: reason === r.value ? '#dc2626' : '#475569',
                  }}>
                    {language === 'es' ? r.labelEs : r.labelEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 600,
              color: '#475569',
            }}>
              {t.teacherLibrary.reportDetails}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={language === 'es' 
                ? 'Describí el problema con más detalle...' 
                : 'Describe the problem in more detail...'}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 14,
                borderRadius: 10,
                border: '2px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: 100,
                resize: 'vertical',
              }}
              rows={4}
            />
          </div>

          {/* Warning */}
          <div style={{
            padding: 12,
            backgroundColor: '#fffbeb',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            color: '#b45309',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>
              {language === 'es' 
                ? 'Los reportes falsos pueden resultar en restricciones a tu cuenta.'
                : 'False reports may result in restrictions to your account.'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: '2px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              {t.common.cancel}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !reason}
              style={{
                flex: 1,
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                background: reason 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : '#e2e8f0',
                color: reason ? 'white' : '#94a3b8',
                cursor: isSubmitting || !reason ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting 
                ? t.common.loading 
                : `🚩 ${t.teacherLibrary.report}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}