// src/components/library/TeacherGameCard.tsx
// Tarjeta para mostrar un juego de docente (personal o comunidad)

import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import type { TeacherGame } from '../../types/teacherLibrary';
import { getDisplayRating, getRatingStars, TEACHER_LIMITS } from '../../types/teacherLibrary';

interface TeacherGameCardProps {
  game: TeacherGame;
  onUse: (game: TeacherGame) => void;
  onEdit?: (game: TeacherGame) => void;
  onDelete?: (game: TeacherGame) => void;
  onCopy?: (game: TeacherGame) => void;
  onRate?: (game: TeacherGame, stars: number) => void;
  onReport?: (game: TeacherGame) => void;
  onToggleVisibility?: (game: TeacherGame) => void;
  myRating?: number | null;
  isLoading?: boolean;
  showActions?: boolean;
  isAdmin?: boolean;  // ← NUEVO
}

export function TeacherGameCard({
  game,
  onUse,
  onEdit,
  onDelete,
  onCopy,
  onRate,
  onReport,
  onToggleVisibility,
  myRating,
  isLoading = false,
  showActions = true,
  isAdmin = false,  // ← AGREGADO (Cambio 2)
}: TeacherGameCardProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = user?.uid === game.ownerId;
  const displayRating = getDisplayRating(game);
  const isPublic = game.visibility === 'public';

  // Colores según área
  const getAreaColor = (area: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      'Lengua': { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
      'Language Arts': { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
      'Matemática': { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
      'Mathematics': { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
      'Ciencias Naturales': { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' },
      'Natural Sciences': { bg: '#dcfce7', border: '#22c55e', text: '#16a34a' },
      'Ciencias Sociales': { bg: '#fce7f3', border: '#ec4899', text: '#be185d' },
      'Social Studies': { bg: '#fce7f3', border: '#ec4899', text: '#be185d' },
    };
    return colors[area] || { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' };
  };

  const areaColor = getAreaColor(game.area);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete?.(game);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        border: `2px solid ${areaColor.border}40`,
        overflow: 'hidden',
        transition: 'all 0.2s',
        opacity: isLoading ? 0.7 : 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Header con badges */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: areaColor.bg,
        borderBottom: `1px solid ${areaColor.border}30`,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}>
        {/* Game mode */}
        <span style={{
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: game.gameMode === 'coopetition' ? '#6366f1' : '#22c55e',
          color: 'white',
        }}>
          {game.gameMode === 'coopetition' ? '🎯' : '🚦'}
        </span>

        {/* Grade or Level */}
        <span style={{
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: 'white',
          color: areaColor.text,
          border: `1px solid ${areaColor.border}`,
        }}>
          {game.grade || 'Secundario'}
        </span>

        {/* Area */}
        <span style={{
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: 'white',
          color: areaColor.text,
          border: `1px solid ${areaColor.border}`,
        }}>
          {game.area}
        </span>

        {/* Language */}
        <span style={{
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: '#f1f5f9',
          color: '#475569',
        }}>
          {game.language === 'es' ? '🇪🇸' : '🇺🇸'}
        </span>

        {/* Visibility */}
        {isOwner && (
          <span style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: isPublic ? '#dcfce7' : '#f1f5f9',
            color: isPublic ? '#16a34a' : '#64748b',
          }}>
            {isPublic ? '🌐 ' + t.teacherLibrary.public : '🔒 ' + t.teacherLibrary.private}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {/* Title & Author */}
        <h3 style={{
          margin: '0 0 4px 0',
          fontSize: 16,
          fontWeight: 700,
          color: '#1e293b',
          lineHeight: 1.3,
        }}>
          {game.title}
        </h3>

        <p style={{
          margin: '0 0 8px 0',
          fontSize: 12,
          color: '#64748b',
        }}>
          {t.teacherLibrary.by} {isOwner ? t.teacherLibrary.you : game.ownerName}
        </p>

        {/* Description */}
        <p style={{
          margin: '0 0 12px 0',
          fontSize: 13,
          color: '#475569',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {game.description || game.topic}
        </p>

        {/* Rating */}
        {isPublic && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            {displayRating ? (
              <>
                <span style={{ color: '#f59e0b', fontSize: 16 }}>
                  {getRatingStars(game.ratingAvg)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {displayRating}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  ({game.ratingCount} {t.teacherLibrary.ratings})
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                {t.teacherLibrary.noRatingsYet}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          fontSize: 12,
          color: '#64748b',
          marginBottom: 12,
        }}>
          <span>📝 {game.questionCount} preguntas</span>
          {game.timesUsed > 0 && (
            <span>▶️ {game.timesUsed} {t.teacherLibrary.timesUsed}</span>
          )}
          {game.timesCopied > 0 && (
            <span>📋 {game.timesCopied} {t.teacherLibrary.timesCopied}</span>
          )}
        </div>

        {/* Expandable content */}
        {expanded && (
          <div style={{
            padding: 12,
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}>
            {game.mainContents && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: '#475569' }}>{t.library.contents}:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>{game.mainContents}</p>
              </div>
            )}
            {game.mainSkills && (
              <div>
                <strong style={{ color: '#475569' }}>{t.library.skills}:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>{game.mainSkills}</p>
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 12,
          }}
        >
          {expanded ? `▲ ${t.library.lessInfo}` : `▼ ${t.library.moreInfo}`}
        </button>

        {/* Rate (solo si es público, no es dueño, y hay callback) */}
        {isPublic && !isOwner && onRate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            padding: 8,
            backgroundColor: '#fffbeb',
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 12, color: '#b45309' }}>{t.teacherLibrary.rate}:</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRate(game, star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 20,
                    color: (hoverRating || myRating || 0) >= star ? '#f59e0b' : '#e2e8f0',
                    transition: 'transform 0.1s',
                    transform: hoverRating === star ? 'scale(1.2)' : 'none',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            {myRating && (
              <span style={{ fontSize: 11, color: '#16a34a' }}>
                ✓ {t.teacherLibrary.yourRating}: {myRating}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {/* Use button */}
          <button
            onClick={() => onUse(game)}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: `linear-gradient(135deg, ${areaColor.border} 0%, ${areaColor.text} 100%)`,
              color: 'white',
              cursor: isLoading ? 'wait' : 'pointer',
            }}
          >
            {isLoading ? t.common.loading : t.teacherLibrary.useGame}
          </button>

          {/* Owner actions */}
          {isOwner && (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(game)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title={t.teacherLibrary.editGame}
                >
                  ✏️
                </button>
              )}

              {onToggleVisibility && (
                <button
                  onClick={() => onToggleVisibility(game)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title={isPublic ? t.teacherLibrary.makePrivate : t.teacherLibrary.makePublic}
                >
                  {isPublic ? '🔒' : '🌐'}
                </button>
              )}
            </>
          )}

          {/* Delete - visible para owner O admin */}
          {(isOwner || isAdmin) && onDelete && (
            <button
              onClick={handleDeleteClick}
              style={{
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                backgroundColor: confirmDelete ? '#ef4444' : (isAdmin && !isOwner ? '#fef3c7' : '#fee2e2'),
                color: confirmDelete ? 'white' : (isAdmin && !isOwner ? '#b45309' : '#dc2626'),
                cursor: 'pointer',
              }}
              title={isAdmin && !isOwner ? '🛡️ Admin: eliminar juego' : t.teacherLibrary.deleteGame}
            >
              {confirmDelete ? t.common.confirm : (isAdmin && !isOwner ? '🛡️' : '🗑️')}
            </button>
          )}

          {/* Non-owner actions */}
          {!isOwner && isPublic && (
            <>
              {onCopy && (
                <button
                  onClick={() => onCopy(game)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title={t.teacherLibrary.copyGame}
                >
                  📋
                </button>
              )}

              {onReport && (
                <button
                  onClick={() => onReport(game)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title={t.teacherLibrary.report}
                >
                  🚩
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}