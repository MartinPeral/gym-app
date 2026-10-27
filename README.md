# GymLog 🏋️

App web instalable (PWA) para el gimnasio: rutinas, registro de entrenamientos con temporizador de descanso, historial y gráficas de progreso. Funciona sin conexión y los datos se guardan en el propio móvil.

## Novedades de la versión 1.4 (casa o gimnasio)

- **Detección automática del lugar:** al empezar un entreno, la app compara tu ubicación con la del gimnasio (radio de 300 m). La primera vez te pregunta si estás en el gimnasio y guarda ese punto. Si no hay ubicación y el gimnasio está cerrado, cuenta como casa. Siempre puedes cambiarlo a mano.
- **Lugar por rutina:** una rutina se puede marcar como de casa o de gimnasio. Incluye una rutina nueva, "En casa (sin material)", y ejercicios sin material (burpees, puente de glúteo, fondos en silla…).
- **Calendario mensual** en Historial: cada día coloreado según dónde entrenaste (gimnasio, casa, clase o varios a la vez), con el resumen del mes. Al tocar un día ves lo que hiciste.

La ubicación solo se usa en el móvil y no se envía a ningún sitio.

## Novedades de la versión 1.3 (Cuerpo)

Nueva pestaña **Cuerpo**:
- **Perfil:** sexo, fecha de nacimiento, altura, peso objetivo y nivel de actividad.
- **Peso con tendencia:** media móvil exponencial que filtra las subidas y bajadas diarias, cambio a 7 y 30 días y ritmo semanal. Gráfica con rangos de 1 mes a todo el historial.
- **Objetivo:** progreso desde tu peso inicial y fecha estimada de llegada a tu ritmo actual.
- **Composición corporal:** IMC con su escala, % de grasa (método de la Marina de EE. UU. con cuello y cintura, o el dato de tu báscula), masa magra, FFMI normalizado, metabolismo basal (Mifflin-St Jeor) y calorías de mantenimiento.
- **Medidas:** cuello, pecho, cintura, cadera, brazo, muslo y gemelo, con minigráficas y guía de cómo medir.

Todo son estimaciones orientativas.

## Novedades de la versión 1.2 (diseño)

- **Anillo de objetivo semanal** en Inicio, con los días que has ido y tu racha de semanas cumpliendo. El objetivo se cambia en Ajustes.
- **Calendario de constancia** en Progreso: los últimos 4 meses, más intenso cuanto más tiempo entrenaste ese día.
- **Mapa muscular** (frente y espalda) con los músculos trabajados esta semana o en las últimas 4. Toca un músculo para ver sus series.
- **Pantalla de resumen** al terminar, con confeti, récords (y tu marca anterior) y los músculos de ese entreno.
- **Color por rutina**: se elige al editarla y aparece en tarjetas, historial y calendario semanal.

## Novedades de la versión 1.1

- **Tu gimnasio en Inicio:** abierto o cerrado según su horario (VivaGym Los Remedios por defecto) y aviso si empiezas a entrenar cuando falta menos de una hora para el cierre. Se cambia en Ajustes.
- **Clases colectivas:** registra Pilates, Core Fitness, ciclo indoor… con su duración. Cuentan en tu semana.
- **Cardio:** cinta, bici, elíptica, remo y escaladora se apuntan con minutos y km (con ritmo en min/km). También puedes crear tus propios ejercicios de cardio.
- **Calculadora de discos:** desde Inicio o desde cada ejercicio. Te dice qué discos poner en cada lado según la barra y los discos que tengas.
- **Sugerencia de progresión:** si la última vez llegaste a las reps objetivo en todas las series, te propone subir el peso (+2,5 kg por defecto).

## Estructura

```
gym-app/
├── index.html            Página principal
├── manifest.webmanifest  Datos para instalarla como app
├── sw.js                 Service worker (funciona sin internet)
├── css/styles.css        Estilos
├── js/
│   ├── app.js            Pantallas, navegación y botones
│   ├── store.js          Datos y cálculos (récords, 1RM, volumen)
│   └── chart.js          Gráficas con <canvas>
└── icons/                Iconos de la app
```

## Probarla en el ordenador

Abre la carpeta en VS Code, clic derecho en `index.html` → **Open with Live Server**.
(Haciendo doble clic en el archivo no funciona, porque usa módulos de JavaScript.)

## Ponerla en tu iPhone (gratis, con GitHub Pages)

1. Crea una cuenta en github.com si no tienes.
2. Crea un repositorio nuevo **público** llamado `gym-app`.
3. Pulsa **"uploading an existing file"** y arrastra **el contenido** de la carpeta (index.html, css, js, icons…), no la carpeta entera. Pulsa **Commit changes**.
4. En el repositorio: **Settings → Pages → Branch: main → / (root) → Save**.
5. Espera 1-2 minutos. Tu app estará en `https://TU-USUARIO.github.io/gym-app/`
6. En el iPhone, abre ese enlace **con Safari** → botón Compartir → **Añadir a pantalla de inicio**.

Ya la tienes como una app más, a pantalla completa y sin barra del navegador.

## Actualizarla

Sube los archivos cambiados al repositorio. Cambia también `CACHE = 'gymlog-v1'` en `sw.js` a `v2`, `v3`… para que el móvil coja la versión nueva.

## Copias de seguridad

Los datos solo están en tu móvil. En **Inicio → ⚙️ Ajustes → Exportar copia** puedes guardar un archivo con todo (por ejemplo en Archivos o iCloud) y recuperarlo con **Importar**.
