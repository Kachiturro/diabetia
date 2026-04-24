<template>
  <main>
     <section class="hero-small">
    <h1>Tecnología que salva vidas</h1>
    <p>Del dato clínico a la detección temprana mediante Inteligencia Artificial.</p>
  </section>
  
  <section class="mission-section">
    <div class="mission-container-split">    
        <div class="mission-text">
            <h2>Nuestra Misión</h2>
            <div class="accent-line"></div> <p>La Diabetes Mellitus es una enfermedad silenciosa. En México y el mundo, la falta de herramientas accesibles para el monitoreo preventivo impide conocer el riesgo a tiempo.</p>
            <p><strong>Insulin.IA</strong> nace como una respuesta tecnológica para empoderar al usuario con una herramienta de <strong>triaje inteligente</strong> que identifica señales de alerta temprana, promoviendo una cultura de prevención.</p>
        </div>
        
        <div class="mission-image">
            <img src="/imagenes/vistatablet.png" alt="Vista de la aplicación">
        </div>
    </div>
  </section>

  <section class="steps-section">
    <h2>¿Cómo funciona nuestra IA?</h2>
    <p class="subtitle">Un proceso de 3 pasos impulsado por algoritmos de Machine Learning</p>
    
    <div class="steps-container">
      
      <div class="step-card">
        <div class="step-icon"><i class="fas fa-file-medical"></i></div>
        <h3>1. Ingreso de Datos</h3>
        <p>El usuario introduce variables clínicas clave (glucosa, IMC, presión, etc.) y la edad se calcula automáticamente a partir de la fecha de nacimiento del paciente.</p>
      </div>

      <div class="step-arrow">➜</div>

      <div class="step-card">
        <div class="step-icon"><i class="fas fa-brain"></i></div>
        <h3>2. Análisis Predictivo</h3>
        <p>Nuestro modelo compara tus datos con un <strong>Dataset Clínico (diabetes.csv)</strong> de miles de pacientes reales, buscando patrones de riesgo invisibles a simple vista.</p>
      </div>

      <div class="step-arrow">➜</div>

      <div class="step-card">
        <div class="step-icon"><i class="fas fa-heartbeat"></i></div>
        <h3>3. Resultado y Acción</h3>
        <p>El sistema devuelve una probabilidad de riesgo (Bajo o Alto) y proporciona recomendaciones específicas para acudir a un especialista si es necesario.</p>
      </div>

    </div>
  </section>

  <section class="tech-specs">
    <h3>Ficha Técnica del Modelo</h3>
    <div class="specs-grid">
      <div class="spec-item">
        <strong>Modelo:</strong> Clasificación Binaria Supervisada
      </div>
      <div class="spec-item">
        <strong>Entrenamiento:</strong> Dataset Histórico Validado
      </div>
      <div class="spec-item">
        <strong>Objetivo:</strong> Minimizar falsos negativos
      </div>
    </div>
  </section>
    </main>
</template>

<script setup>
</script>
