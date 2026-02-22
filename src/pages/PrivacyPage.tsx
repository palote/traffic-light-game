// src/pages/PrivacyPage.tsx
import React from 'react';

export function PrivacyPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Privacy Policy / Política de Privacidad</h1>
      <p style={styles.lastUpdated}><strong>Last updated / Última actualización:</strong> February 2026</p>

      <hr style={styles.hr} />

      {/* English Section */}
      <section style={styles.section}>
        <h2 style={styles.h2}>English</h2>

        <h3 style={styles.h3}>Introduction</h3>
        <p>Traffic Light Game ("we", "our", or "us") is committed to protecting the privacy of our users, especially students and educators. This Privacy Policy explains how we collect, use, and protect information when you use our educational application.</p>

        <h3 style={styles.h3}>Information We Collect</h3>
        <p><strong>Information from Google Sign-In:</strong></p>
        <ul style={styles.ul}>
          <li>Name</li>
          <li>Email address</li>
          <li>Profile picture (optional)</li>
        </ul>
        <p><strong>Information from Google Classroom (with your permission):</strong></p>
        <ul style={styles.ul}>
          <li>Course names where you are a teacher</li>
          <li>Student names in your courses (for game setup only)</li>
        </ul>
        <p><strong>Game Data:</strong></p>
        <ul style={styles.ul}>
          <li>Game configurations created by teachers</li>
          <li>Student responses during games (anonymous within teams)</li>
          <li>Scores and game results</li>
        </ul>

        <h3 style={styles.h3}>How We Use Information</h3>
        <p>We use the collected information to:</p>
        <ul style={styles.ul}>
          <li>Authenticate teachers and provide access to the application</li>
          <li>Import student lists from Google Classroom to facilitate game setup</li>
          <li>Save game configurations for future use</li>
          <li>Display real-time game results to teachers</li>
        </ul>

        <h3 style={styles.h3}>Data Storage</h3>
        <ul style={styles.ul}>
          <li>All data is stored securely in Google Firebase servers</li>
          <li>Data is encrypted in transit and at rest</li>
          <li>We do not sell, rent, or share personal information with third parties</li>
        </ul>

        <h3 style={styles.h3}>Data Retention</h3>
        <ul style={styles.ul}>
          <li>Game data is retained while the teacher's account is active</li>
          <li>Teachers can delete their games and data at any time</li>
          <li>Upon account deletion, all associated data is permanently removed within 30 days</li>
        </ul>

        <h3 style={styles.h3}>Children's Privacy (COPPA Compliance)</h3>
        <ul style={styles.ul}>
          <li>Students do not create accounts or provide personal information directly</li>
          <li>Students access games through a shared device per team using a room code</li>
          <li>No personal information is collected from students under 13</li>
          <li>Student names are only visible to their teacher</li>
        </ul>

        <h3 style={styles.h3}>Google API Services User Data Policy</h3>
        <p>Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        <p>We only request the minimum permissions necessary:</p>
        <ul style={styles.ul}>
          <li><code>classroom.courses.readonly</code> - To list your courses</li>
          <li><code>classroom.rosters.readonly</code> - To import student names</li>
        </ul>

        <h3 style={styles.h3}>Your Rights</h3>
        <p>You have the right to:</p>
        <ul style={styles.ul}>
          <li>Access your personal data</li>
          <li>Request deletion of your data</li>
          <li>Revoke Google permissions at any time through your Google Account settings</li>
        </ul>

        <h3 style={styles.h3}>Security</h3>
        <ul style={styles.ul}>
          <li>HTTPS encryption for all data transmission</li>
          <li>Firebase Security Rules to protect data access</li>
          <li>Regular security reviews</li>
        </ul>

        <h3 style={styles.h3}>Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify users of any material changes by posting the new policy on this page.</p>

        <h3 style={styles.h3}>Contact Us</h3>
        <p>If you have questions about this Privacy Policy, please contact us at: <a href="mailto:pabloparente@gmail.com">pabloparente@gmail.com</a></p>
      </section>

      <hr style={styles.hr} />

      {/* Español Section */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Español</h2>

        <h3 style={styles.h3}>Introducción</h3>
        <p>Traffic Light Game / El Juego del Semáforo ("nosotros") está comprometido con la protección de la privacidad de nuestros usuarios, especialmente estudiantes y educadores. Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos la información cuando utilizás nuestra aplicación educativa.</p>

        <h3 style={styles.h3}>Información que Recopilamos</h3>
        <p><strong>Información de Google Sign-In:</strong></p>
        <ul style={styles.ul}>
          <li>Nombre</li>
          <li>Dirección de correo electrónico</li>
          <li>Foto de perfil (opcional)</li>
        </ul>
        <p><strong>Información de Google Classroom (con tu permiso):</strong></p>
        <ul style={styles.ul}>
          <li>Nombres de los cursos donde sos docente</li>
          <li>Nombres de estudiantes en tus cursos (solo para configurar el juego)</li>
        </ul>
        <p><strong>Datos del Juego:</strong></p>
        <ul style={styles.ul}>
          <li>Configuraciones de juegos creadas por docentes</li>
          <li>Respuestas de estudiantes durante los juegos (anónimas dentro de equipos)</li>
          <li>Puntajes y resultados de juegos</li>
        </ul>

        <h3 style={styles.h3}>Cómo Usamos la Información</h3>
        <p>Usamos la información recopilada para:</p>
        <ul style={styles.ul}>
          <li>Autenticar docentes y proveer acceso a la aplicación</li>
          <li>Importar listas de estudiantes desde Google Classroom para facilitar la configuración</li>
          <li>Guardar configuraciones de juegos para uso futuro</li>
          <li>Mostrar resultados del juego en tiempo real a los docentes</li>
        </ul>

        <h3 style={styles.h3}>Almacenamiento de Datos</h3>
        <ul style={styles.ul}>
          <li>Todos los datos se almacenan de forma segura en servidores de Google Firebase</li>
          <li>Los datos están encriptados en tránsito y en reposo</li>
          <li>No vendemos, alquilamos ni compartimos información personal con terceros</li>
        </ul>

        <h3 style={styles.h3}>Retención de Datos</h3>
        <ul style={styles.ul}>
          <li>Los datos del juego se conservan mientras la cuenta del docente esté activa</li>
          <li>Los docentes pueden eliminar sus juegos y datos en cualquier momento</li>
          <li>Al eliminar la cuenta, todos los datos asociados se eliminan permanentemente en 30 días</li>
        </ul>

        <h3 style={styles.h3}>Privacidad de Menores (Cumplimiento COPPA)</h3>
        <ul style={styles.ul}>
          <li>Los estudiantes no crean cuentas ni proporcionan información personal directamente</li>
          <li>Los estudiantes acceden a los juegos a través de un dispositivo compartido por equipo usando un código de sala</li>
          <li>No se recopila información personal de estudiantes menores de 13 años</li>
          <li>Los nombres de los estudiantes solo son visibles para su docente</li>
        </ul>

        <h3 style={styles.h3}>Política de Datos de Usuario de Servicios de API de Google</h3>
        <p>Nuestro uso de la información recibida de las APIs de Google cumple con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Política de Datos de Usuario de Servicios de API de Google</a>, incluyendo los requisitos de Uso Limitado.</p>
        <p>Solo solicitamos los permisos mínimos necesarios:</p>
        <ul style={styles.ul}>
          <li><code>classroom.courses.readonly</code> - Para listar tus cursos</li>
          <li><code>classroom.rosters.readonly</code> - Para importar nombres de estudiantes</li>
        </ul>

        <h3 style={styles.h3}>Tus Derechos</h3>
        <p>Tenés derecho a:</p>
        <ul style={styles.ul}>
          <li>Acceder a tus datos personales</li>
          <li>Solicitar la eliminación de tus datos</li>
          <li>Revocar los permisos de Google en cualquier momento desde la configuración de tu Cuenta de Google</li>
        </ul>

        <h3 style={styles.h3}>Seguridad</h3>
        <ul style={styles.ul}>
          <li>Encriptación HTTPS para toda la transmisión de datos</li>
          <li>Reglas de Seguridad de Firebase para proteger el acceso a datos</li>
          <li>Revisiones de seguridad periódicas</li>
        </ul>

        <h3 style={styles.h3}>Cambios a Esta Política</h3>
        <p>Podemos actualizar esta Política de Privacidad ocasionalmente. Notificaremos a los usuarios sobre cambios importantes publicando la nueva política en esta página.</p>

        <h3 style={styles.h3}>Contacto</h3>
        <p>Si tenés preguntas sobre esta Política de Privacidad, contactanos en: <a href="mailto:pabloparente@gmail.com">pabloparente@gmail.com</a></p>
      </section>

      <hr style={styles.hr} />

      {/* Português Section */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Português</h2>

        <h3 style={styles.h3}>Introdução</h3>
        <p>Traffic Light Game / O Jogo do Semáforo ("nós") está comprometido com a proteção da privacidade de nossos usuários, especialmente estudantes e educadores. Esta Política de Privacidade explica como coletamos, usamos e protegemos as informações quando você usa nosso aplicativo educacional.</p>

        <h3 style={styles.h3}>Informações que Coletamos</h3>
        <p><strong>Informações do Google Sign-In:</strong></p>
        <ul style={styles.ul}>
          <li>Nome</li>
          <li>Endereço de e-mail</li>
          <li>Foto de perfil (opcional)</li>
        </ul>
        <p><strong>Informações do Google Classroom (com sua permissão):</strong></p>
        <ul style={styles.ul}>
          <li>Nomes dos cursos onde você é professor</li>
          <li>Nomes de estudantes em seus cursos (apenas para configurar o jogo)</li>
        </ul>
        <p><strong>Dados do Jogo:</strong></p>
        <ul style={styles.ul}>
          <li>Configurações de jogos criadas por professores</li>
          <li>Respostas de estudantes durante os jogos (anônimas dentro das equipes)</li>
          <li>Pontuações e resultados dos jogos</li>
        </ul>

        <h3 style={styles.h3}>Como Usamos as Informações</h3>
        <p>Usamos as informações coletadas para:</p>
        <ul style={styles.ul}>
          <li>Autenticar professores e fornecer acesso ao aplicativo</li>
          <li>Importar listas de estudantes do Google Classroom para facilitar a configuração</li>
          <li>Salvar configurações de jogos para uso futuro</li>
          <li>Exibir resultados do jogo em tempo real para os professores</li>
        </ul>

        <h3 style={styles.h3}>Armazenamento de Dados</h3>
        <ul style={styles.ul}>
          <li>Todos os dados são armazenados com segurança nos servidores do Google Firebase</li>
          <li>Os dados são criptografados em trânsito e em repouso</li>
          <li>Não vendemos, alugamos ou compartilhamos informações pessoais com terceiros</li>
        </ul>

        <h3 style={styles.h3}>Retenção de Dados</h3>
        <ul style={styles.ul}>
          <li>Os dados do jogo são mantidos enquanto a conta do professor estiver ativa</li>
          <li>Os professores podem excluir seus jogos e dados a qualquer momento</li>
          <li>Ao excluir a conta, todos os dados associados são removidos permanentemente em 30 dias</li>
        </ul>

        <h3 style={styles.h3}>Privacidade de Menores (Conformidade COPPA)</h3>
        <ul style={styles.ul}>
          <li>Os estudantes não criam contas nem fornecem informações pessoais diretamente</li>
          <li>Os estudantes acessam os jogos através de um dispositivo compartilhado por equipe usando um código de sala</li>
          <li>Não são coletadas informações pessoais de estudantes menores de 13 anos</li>
          <li>Os nomes dos estudantes são visíveis apenas para seu professor</li>
        </ul>

        <h3 style={styles.h3}>Política de Dados de Usuário dos Serviços de API do Google</h3>
        <p>Nosso uso das informações recebidas das APIs do Google está em conformidade com a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Política de Dados de Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>
        <p>Solicitamos apenas as permissões mínimas necessárias:</p>
        <ul style={styles.ul}>
          <li><code>classroom.courses.readonly</code> - Para listar seus cursos</li>
          <li><code>classroom.rosters.readonly</code> - Para importar nomes de estudantes</li>
        </ul>

        <h3 style={styles.h3}>Seus Direitos</h3>
        <p>Você tem o direito de:</p>
        <ul style={styles.ul}>
          <li>Acessar seus dados pessoais</li>
          <li>Solicitar a exclusão de seus dados</li>
          <li>Revogar as permissões do Google a qualquer momento nas configurações da sua Conta do Google</li>
        </ul>

        <h3 style={styles.h3}>Segurança</h3>
        <ul style={styles.ul}>
          <li>Criptografia HTTPS para toda transmissão de dados</li>
          <li>Regras de Segurança do Firebase para proteger o acesso aos dados</li>
          <li>Revisões de segurança periódicas</li>
        </ul>

        <h3 style={styles.h3}>Alterações nesta Política</h3>
        <p>Podemos atualizar esta Política de Privacidade ocasionalmente. Notificaremos os usuários sobre mudanças importantes publicando a nova política nesta página.</p>

        <h3 style={styles.h3}>Contato</h3>
        <p>Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato: <a href="mailto:pabloparente@gmail.com">pabloparente@gmail.com</a></p>
      </section>
    </div>
  );
}

// Estilos en línea (puedes moverlos a un archivo CSS si prefieres)
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'Arial, sans-serif',
    lineHeight: 1.6,
    color: '#333',
  },
  h1: {
    fontSize: '2.5em',
    marginBottom: '0.5em',
    color: '#222',
  },
  lastUpdated: {
    fontSize: '0.9em',
    color: '#666',
    marginBottom: '2em',
  },
  h2: {
    fontSize: '2em',
    marginTop: '1.5em',
    marginBottom: '0.75em',
    color: '#22c55e', // verde para diferenciar secciones
  },
  h3: {
    fontSize: '1.25em',
    marginTop: '1.5em',
    marginBottom: '0.5em',
    color: '#333',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #ddd',
    margin: '2em 0',
  },
  section: {
    marginBottom: '2em',
  },
  ul: {
    paddingLeft: '20px',
    marginBottom: '1em',
  },
};