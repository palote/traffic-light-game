// src/components/TeacherFloatingButton.tsx
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

interface TeacherFloatingButtonProps {
  onForceStage2: () => void;
  currentStage: string;
}

export function TeacherFloatingButton({ onForceStage2, currentStage }: TeacherFloatingButtonProps) {
  const { language } = useI18n();
  
  // Solo mostrar si estamos en stage1 o stage1-complete
  if (!currentStage?.startsWith('stage1')) {
    return null;
  }
  
  const buttonText = language === 'es' 
    ? '⏩ Pasar todos a Etapa 2' 
    : language === 'pt' 
    ? '⏩ Passar todos para Etapa 2' 
    : '⏩ Move all to Stage 2';

  const button = (
    <button
      onClick={onForceStage2}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483647, // Máximo z-index posible
        padding: '12px 24px',
        backgroundColor: '#7c3aed',
        color: 'white',
        border: 'none',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {buttonText}
    </button>
  );

  // Renderizar directamente en el body, fuera del árbol React normal
  return createPortal(button, document.body);
}