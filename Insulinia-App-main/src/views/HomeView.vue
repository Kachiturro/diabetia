<template>
  <main>
    <!-- HERO -->
    <section class="hero">
      <h1>
        IA PARA LA DETECCIÓN<br />
        TEMPRANA DE DIABETES TIPO 1 Y 2
      </h1>
      <p>Inteligencia Artificial para el diagnóstico precoz de la diabetes tipo 1 y tipo 2.</p>
      <router-link to="/comofunciona" class="btn-primary">¿Conoce más?</router-link>
      <div class="wave"></div>
    </section>

    <!-- FEATURES -->
    <section class="features">
      <div class="feature-card">
        <div>
          <h3>Evaluación de Historial Médico</h3>
          <p>Nuestro sistema analiza tus registros clínicos para detectar patrones de riesgo.</p>
        </div>
        <div class="icon">📄</div>
      </div>

      <div class="feature-card">
        <div>
          <h3>Diagnóstico Predictivo</h3>
          <p>IA avanzada que predice el riesgo antes de que aparezcan los síntomas.</p>
        </div>
        <div class="icon">🧠</div>
      </div>
    </section>

    <!-- MONITOREO -->
    <section class="monitoring">
      <h2>MONITOREO INTEGRAL</h2>
      <div class="monitor-grid">
        <div class="monitor-card">🧪<span>Análisis de Laboratorio</span></div>
        <div class="monitor-card">🩸<span>Niveles de Glucosa</span></div>
        <div class="monitor-card">👨‍👩‍👧<span>Antecedentes Familiares</span></div>
      </div>
    </section>

    <!-- ANALISIS -->
    <section class="analysis">
      <h2>Análisis de Datos con IA</h2>
      <p>Nuestros algoritmos revisan tu historial para detectar señales tempranas.</p>

      <div class="image-box">
        <img
          src="https://images.unsplash.com/photo-1758691463110-697a814b2033?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwYW5hbHlzaXMlMjBkYXRhJTIwYnJhaW58ZW58MXx8fHwxNzcwMTcyNjUzfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Análisis médico"
        />
        <button class="floating-btn">+</button>
      </div>

      <div class="note">
        <strong>Nota Importante</strong>
        <p>
          Los resultados proporcionados por nuestro sistema son aproximaciones estadísticas. No
          sustituyen un diagnóstico médico profesional.
        </p>
      </div>

      <router-link to="/evaluacion" class="btn-secondary"> Comienza tu Evaluación → </router-link>
    </section>
  </main>
</template>

<script setup></script>
