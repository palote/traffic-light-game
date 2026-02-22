import React from 'react';
import { Link } from 'react-router-dom';
import './TeacherGuideButton.css';

export const TeacherGuideButton: React.FC = () => {
  return (
    <Link
      to="/teacher-guide"
      className="teacher-guide-button"
      title="Abrir Guía Pedagógica"
      aria-label="Guía Pedagógica"
    >
      <span className="icon">📖</span>
      <span className="tooltip">Guía Pedagógica</span>
    </Link>
  );
  
};