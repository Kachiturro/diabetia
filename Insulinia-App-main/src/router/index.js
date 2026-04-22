import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ComoFunciona from '../views/ComoFunciona.vue'
import Beneficios from '../views/Beneficios.vue'
import Contacto from '../views/Contacto.vue'
import Perfil from '../views/Perfil.vue'
import Login from '../views/Login.vue'
import Registro from '../views/Registro.vue'
import Evaluacion from '../views/Evaluacion.vue'
import RegistroPaciente from '../views/RegistroPaciente.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  // ¡Aquí está la magia! Le decimos a Vue que siempre suba el scroll a la posición 0
  scrollBehavior(to, from, savedPosition) {
    return { top: 0, behavior: 'smooth' } // 'smooth' le da una transición de deslizamiento elegante
  },

  routes: [
    { path: '/', name: 'inicio', component: HomeView },
    { path: '/comofunciona', name: 'comofunciona', component: ComoFunciona },
    { path: '/beneficios', name: 'beneficios', component: Beneficios },
    { path: '/contacto', name: 'contacto', component: Contacto },
    { path: '/perfil', name: 'perfil', component: Perfil },
    { path: '/login', name: 'login', component: Login },
    { path: '/registro', name: 'registro', component: Registro },
    { path: '/evaluacion', name: 'evaluacion', component: Evaluacion },
    { path: '/nuevo-paciente', name: 'nuevo-paciente', component: RegistroPaciente },
    { path: '/detalle/:datosID', name: 'detalle', component: () => import('../views/Detalle.vue') },
  ],
})

export default router
