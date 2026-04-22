<template>
  <main>
    <section class="hero-small">
    <h1>Estamos para escucharte</h1>
    <p>Tu retroalimentación nos ayuda a perfeccionar nuestra tecnología de detección.</p>
  </section>

  <section class="contact-section">
    <div class="contact-card-split">
      
      <div class="contact-info">
        <h3>Información Institucional</h3>
        <p class="info-intro">Proyecto de investigación académica sin fines de lucro desarrollado en el IT Culiacán.</p>
        
        <div class="info-item">
          <i class="fas fa-map-marker-alt"></i>
          <div>
            <strong>Ubicación:</strong><br>
            Instituto Tecnológico de Culiacán<br>
            Av. Juan de Dios Bátiz 310 Pte.
          </div>
        </div>

        <div class="info-item">
          <i class="fas fa-envelope"></i>
          <div>
            <strong>Correo Electrónico:</strong><br>
            contacto@insulin-ia.mx
          </div>
        </div>

        <div class="info-item">
          <i class="fas fa-clock"></i>
          <div>
            <strong>Horario:</strong><br>
            Lunes a Viernes, 9:00 - 17:00 hrs
          </div>
        </div>

        <div class="social-links">
          <a href="#"><i class="fab fa-github"></i></a>
          <a href="#"><i class="fab fa-linkedin"></i></a>
        </div>
      </div>

      <div class="contact-form-wrapper">
        <h3>Envíanos un mensaje</h3>
        <form>
          <div class="form-group-contact">
            <label>Nombre Completo</label>
            <input type="text" placeholder="Ej. Dr. Roberto Gómez" required>
          </div>

          <div class="form-group-contact">
            <label>Correo Electrónico</label>
            <input type="email" placeholder="nombre@correo.com" required>
          </div>

          <div class="form-group-contact">
            <label>Asunto</label>
            <select>
              <option>Duda sobre mi resultado</option>
              <option>Reportar un error</option>
              <option>Colaboración académica</option>
              <option>Otro</option>
            </select>
          </div>

          <div class="form-group-contact">
            <label>Mensaje</label>
            <textarea rows="4" placeholder="Escribe tu mensaje aquí..."></textarea>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%;">Enviar Mensaje</button>
        </form>
      </div>

    </div>
  </section>

  <section class="team-section">
    <h2>Equipo de Desarrollo</h2>
    <div class="team-grid">
      
      <div class="team-card">
        <div class="avatar">CG</div>
        <h4>Ing. Cristian Godinez</h4>
        <p>Desarrollador Frontend</p>
      </div>

      <div class="team-card">
        <div class="avatar">HN</div>
        <h4>Ing. Hiram Noriega</h4>
        <p>Desarrollador Frontend</p>
      </div>

      <div class="team-card">
        <div class="avatar">LM</div>
        <h4>Ing. Luis Martinez</h4>
        <p>Desarrollador Backend</p>
      </div>

      <div class="team-card">
        <div class="avatar">JR</div>
        <h4>Ing. Jorge Rodriguez</h4>
        <p>Analista de Datos</p>
      </div>

      <div class="team-card">
        <div class="avatar">NR</div>
        <h4>Ing. Nahomy Rios</h4>
        <p>Investigación Documental</p>
      </div>

    </div>
  </section>
    </main>
</template>

<script setup>
</script>