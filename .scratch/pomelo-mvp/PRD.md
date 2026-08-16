# PRD: Pomelo MVP - un ritual diario privado para parejas

Status: ready-for-agent

## Problem Statement

Muchas parejas quieren cuidar su relación con más intención, compartir cosas pequeñas y conservar recuerdos, pero las herramientas existentes suelen caer en uno de estos extremos: chats que ya usan para todo, ejercicios que se sienten terapéuticos o exigentes, álbumes que requieren trabajo manual, y mascotas virtuales que convierten el hábito en obligación. La consecuencia es que la propuesta suena bien, pero no se transforma en un ritual compartido que ambos miembros quieran mantener.

El problema no es únicamente iniciar una conversación. Es crear, entre dos personas y con muy poco esfuerzo, una pequeña experiencia diaria que tenga anticipación, reciprocidad y una recompensa duradera. Además, la aplicación debe resultar suficientemente amable y atractiva para recomendarla a la pareja, sin sentirse infantil, excesivamente romántica o diseñada solo para uno de los dos.

Como producto nuevo, Pomelo también necesita demostrar el valor completo antes de cobrar, validar pronto la disposición a pagar y poder lanzarse en iOS y Android en pocas semanas sin comprometer la privacidad de respuestas, fotos, dibujos, ubicación o recuerdos.

## Solution

Pomelo ofrece a cada Pair un único Moment diario en formato Question, Photo o Doodle. Ambos miembros participan; en Question y Photo cada Contribution permanece oculta hasta que los dos terminan, mientras que Doodle es una creación conjunta en un lienzo en tiempo real. Cuando el Moment está listo, cualquiera puede iniciar Reveal. El resultado se guarda automáticamente como Memory, alimenta History, puede aparecer en Map si se añadió una ciudad aproximada y hace reaccionar o progresar a Pom.

La aplicación convierte así una acción breve en un ciclo reconocible: participar, esperar a la pareja, descubrir juntos y conservar algo que gana valor con el tiempo. Después de Reveal, cada Memory puede continuar mediante un Thread ligero, sin intentar sustituir el chat habitual de la pareja.

El primer Moment completo es gratuito y no requiere tarjeta. Tras su Reveal se presenta Premium para la Pair: una sola suscripción habilita a ambos miembros para seguir creando Moments. Si no compran o la suscripción caduca, los recuerdos permitidos permanecen legibles en Archive Mode y no se usa a Pom como castigo.

## User Stories

### Descubrimiento, cuenta y perfil

1. Como persona que abre Pomelo por primera vez, quiero entender en pocos segundos que la app convierte pequeños momentos diarios en una historia compartida, para decidir si quiero empezar.
2. Como persona nueva, quiero ver una demostración breve del ciclo participar, Reveal y Memory, para comprender el producto sin leer una explicación larga.
3. Como persona nueva, quiero que Pom aparezca como parte activa de la demostración, para reconocer la personalidad de la marca.
4. Como persona con una cuenta existente, quiero encontrar claramente la opción de iniciar sesión en la bienvenida, para recuperar mi espacio sin repetir el onboarding.
5. Como persona nueva, quiero indicar mi nombre, para que mi pareja y la app puedan identificarme.
6. Como persona nueva, quiero recibir un avatar inicial y poder generar otro con un toque, para avanzar sin afrontar una cuadrícula de decisiones.
7. Como persona nueva, quiero que el avatar sea obligatorio, para que ambos miembros tengan una representación visual consistente.
8. Como persona nueva, quiero introducir mi fecha de nacimiento completa con el selector nativo del sistema, para registrar mi cumpleaños de forma familiar y rápida.
9. Como User, quiero crear una cuenta con correo electrónico, para recuperar mis datos en otro dispositivo.
10. Como User de iOS, quiero continuar con Apple, para crear o recuperar mi cuenta con menos fricción.
11. Como User de Android, quiero disponer de un método de autenticación equivalente y apropiado para la plataforma, para no depender de iOS.
12. Como User, quiero que mi sesión se restaure de forma segura al volver a abrir la app, para no iniciar sesión cada día.
13. Como User, quiero cerrar sesión sin borrar mis datos, para usar otro dispositivo o proteger mi cuenta.
14. Como User, quiero eliminar mi cuenta y los datos que me pertenecen, para ejercer control sobre mi información.
15. Como User que cambia de dispositivo, quiero recuperar Profile, Pair, Premium y Memories permitidas, para no perder mi historia.

### Pair e Invitation

16. Como User sin Pair, quiero crear un espacio de pareja, para empezar a usar Pomelo con otra persona.
17. Como creador de una Pair, quiero enviar una Invitation mediante un enlace, para que mi pareja pueda unirse con pocos pasos.
18. Como creador de una Pair, quiero disponer también de un código alternativo, para invitar cuando el enlace no funcione o se comparta por otro canal.
19. Como destinatario de una Invitation, quiero abrir el enlace y ver claramente a qué Pair me estoy uniendo, para confirmar la acción con confianza.
20. Como destinatario de una Invitation, quiero introducir el código manualmente, para unirme aunque no haya abierto el enlace en el mismo dispositivo.
21. Como creador de una Pair, quiero ver el estado de espera, para saber que todavía falta mi pareja.
22. Como creador de una Pair, quiero reenviar o cancelar una Invitation pendiente, para corregir errores sin crear otra Pair.
23. Como User, quiero recibir una explicación clara si una Invitation ha caducado, fue cancelada o ya se usó, para saber cómo continuar.
24. Como miembro de una Pair, quiero que ningún tercer User pueda unirse, para mantener el espacio estrictamente privado.
25. Como User, quiero pertenecer como máximo a una Pair activa, para evitar ambigüedades de Memories, Premium y Streak.
26. Como segundo miembro, quiero completar el mismo onboarding personal que mi pareja salvo los datos compartidos ya definidos, para que ambos Profiles tengan la misma calidad.
27. Como Pair, quiero registrar nuestro aniversario una sola vez y poder corregirlo, para conservar una fecha compartida coherente.
28. Como miembro de una Pair, quiero desvincularme con una explicación explícita de las consecuencias, para no perder acceso por accidente.
29. Como exmiembro de una Pair disuelta, quiero conservar en Archive Mode el contenido que me corresponda, para no perder mi historia personal permitida.
30. Como exmiembro, quiero que la Pair disuelta deje de generar Moments, para que no se creen experiencias conjuntas después de la separación.

### Primer valor y Home

31. Como Pair nueva, quiero recibir un primer Moment diseñado para demostrar el producto completo, para comprender su valor antes de pagar.
32. Como miembro de una Pair nueva, quiero completar el primer Moment sin tarjeta, para probar Pomelo sin asumir un compromiso económico.
33. Como User, quiero que Home me muestre una única acción principal y el estado actual del Moment, para saber inmediatamente qué toca hacer.
34. Como User, quiero ver si me toca, si mi pareja está pendiente o si el Moment está listo, para no interpretar estados ambiguos.
35. Como User, quiero que los estados se presenten con un lenguaje visual de conversación, para sentir que estamos construyendo algo entre los dos.
36. Como User, quiero ver a Pom en Home sin que hable mediante bocadillos, para que acompañe la experiencia sin confundirse con un participante.
37. Como Pair, quiero recibir como máximo un Moment por día local de la Pair, para que el ritual sea claro y sostenible.
38. Como User, quiero que un fallo temporal se pueda reintentar sin duplicar Contribution, Reveal o Memory, para confiar en el resultado.
39. Como User sin conexión, quiero conservar de forma segura el trabajo que todavía no he enviado y entender qué falta sincronizar, para no perderlo.

### Lifecycle común del Moment

40. Como miembro de una Pair, quiero ver el mismo Prompt que mi pareja, para responder a una experiencia verdaderamente compartida.
41. Como User, quiero editar mi Contribution antes de enviarla, para corregirla sin revelar nada.
42. Como User, quiero que el envío sea una acción explícita y que después quede cerrado en el MVP, para saber cuándo he terminado.
43. Como User de un Question o Photo Moment, quiero que mi pareja no pueda leer ni recuperar mi Contribution antes de Reveal, para participar con confianza.
44. Como User que ya participó, quiero ver que mi respuesta está guardada y oculta, para poder salir de la app con tranquilidad.
45. Como User que ya participó, quiero avisar a mi pareja sin compartir mi Contribution, para ayudar a completar el ritual.
46. Como User, quiero recibir una indicación cuando mi pareja ya ha participado, para volver y completar mi parte.
47. Como Pair, quiero que el Moment solo quede ready cuando se cumplan las reglas del formato para ambos miembros, para evitar resultados incompletos.
48. Como miembro de una Pair, quiero iniciar Reveal cuando el Moment esté ready, para compartir el instante de descubrimiento.
49. Como pareja del User que inicia Reveal, quiero que el resultado también quede revelado para mí, para mantener un único estado compartido.
50. Como Pair, quiero que Reveal cree exactamente una Memory, para que History no tenga duplicados aunque haya reintentos.
51. Como Pair, quiero que un Moment con una sola Contribution nunca se revele ni cree una Memory conjunta, para respetar la expectativa de reciprocidad.
52. Como User, quiero disponer de 24 horas normales y una ventana adicional de recuperación, para que un día ocupado no destruya inmediatamente el hábito.
53. Como User, quiero saber cuánto tiempo queda y si estoy en recuperación, para decidir si todavía puedo completar el Moment.
54. Como Pair, quiero que un Moment incompleto caduque de forma comprensible, para avanzar sin mostrar contenido privado unilateral.
55. Como User, quiero que Reveal tenga una reacción breve de Pom y movimiento contenido, para que el momento se sienta especial sin ralentizarlo.

### Question

56. Como User, quiero responder una Question con texto corto, para expresar una idea personal sin escribir un diario.
57. Como User, quiero responder determinados Prompts con una única opción A/B/C, para participar rápidamente cuando el formato lo pida.
58. Como User, quiero ver mis respuestas y las de mi pareja como bocadillos alineados a lados opuestos tras Reveal, para leerlas como una conversación.
59. Como User, quiero que las respuestas largas se adapten y puedan abrirse completas, para no truncar el contenido importante.
60. Como Pair, quiero continuar una Question revelada en un Thread ligero, para comentar lo que hemos contestado sin perder el contexto.

### Photo

61. Como User, quiero capturar una imagen con la cámara trasera y otra con la frontal de forma secuencial, para crear una Contribution reconocible al estilo BeReal.
62. Como User, quiero ver qué captura falta y repetir cualquiera antes de enviar, para evitar una Photo accidental.
63. Como User, quiero seleccionar imágenes desde la galería cuando esté permitido, para participar aunque no pueda capturar en ese instante.
64. Como User, quiero que ambas imágenes permanezcan privadas hasta Reveal, para no estropear la sorpresa.
65. Como Pair, quiero ver las Contributions Photo de ambos en composiciones consistentes tras Reveal, para comparar nuestros momentos.
66. Como Pair, quiero que la composición final se guarde como Memory y pueda alimentar el widget visual, para volver a verla fuera de la app cuando lo permitamos.
67. Como User, quiero controlar si una Photo Memory puede aparecer en un widget, para evitar exposición accidental.

### Doodle

68. Como miembro de una Pair, quiero dibujar con mi pareja sobre el mismo lienzo en tiempo real, para crear algo conjuntamente en vez de comparar dos dibujos separados.
69. Como User, quiero distinguir de forma sencilla los trazos de cada miembro, para entender la colaboración sin añadir complejidad.
70. Como User, quiero elegir entre una paleta pequeña, grosor, borrador, deshacer y limpiar, para expresarme con controles suficientes pero simples.
71. Como User, quiero ver que mi pareja está conectada o que sus trazos están llegando, para confiar en que el lienzo es realmente compartido.
72. Como User con conexión inestable, quiero que los trazos se sincronicen sin bloquear el lienzo y sin duplicarse, para poder seguir dibujando.
73. Como Pair, quiero marcar que hemos terminado antes de Reveal, para que un lienzo a medio hacer no se guarde como Memory final.
74. Como Pair, quiero que el documento final sea estable aunque la sesión en tiempo real termine, para conservar el Doodle en History.
75. Como Pair, quiero continuar un Doodle revelado en su Thread, para comentar el resultado.

### Memory, History y Thread

76. Como Pair, quiero que cada Reveal se guarde automáticamente como Memory, para construir History sin trabajo manual.
77. Como User, quiero recorrer History en orden cronológico, para recordar cómo ha crecido nuestra relación.
78. Como User, quiero distinguir de un vistazo Question, Photo y Doodle Memories, para navegar por distintos tipos de contenido.
79. Como User, quiero abrir una Memory y ver Prompt, Contributions disponibles, fecha, Pom y ciudad aproximada si existe, para recuperar todo su contexto.
80. Como User, quiero añadir mensajes de texto al Thread de una Memory revelada, para prolongar una conversación concreta.
81. Como User, quiero recibir una notificación cuando mi pareja responda en un Thread, para no perder el seguimiento.
82. Como User, quiero que un Thread no se convierta en un chat general ni admita media en el MVP, para mantener el producto enfocado.
83. Como User, quiero ocultar o eliminar mi propia Contribution posteriormente, para conservar control sobre lo que aporté.
84. Como pareja de quien elimina una Contribution, quiero ver un estado estable de contenido eliminado, para que History no se rompa ni parezca un error.
85. Como User en Archive Mode, quiero seguir leyendo las Memories que tengo permitidas, para que cerrar el paywall o desvincularse no borre el pasado.

### Location y Map

86. Como User, quiero decidir si añado una ciudad aproximada a una Memory, para contextualizarla sin revelar coordenadas precisas.
87. Como User, quiero retirar la ubicación antes o después de guardar, para cambiar de opinión sobre ese dato.
88. Como User, quiero ver en Map solo las Memories que contienen una ciudad, para explorar nuestra historia geográficamente.
89. Como User, quiero abrir una Memory desde Map, para pasar del lugar al recuerdo completo.
90. Como User, quiero que Map sea de consulta en el MVP, para que añadir puntos no se convierta en otra tarea manual.

### Pom y Progress

91. Como Pair, quiero que Pom reaccione a cada Reveal, para sentir una recompensa inmediata compartida.
92. Como Pair, quiero que Progress avance principalmente con Memories reveladas, para que refleje experiencias creadas por ambos.
93. Como Pair, quiero desbloquear expresiones, estados y unos pocos accesorios, para notar progreso sin gestionar una economía virtual.
94. Como User, quiero consultar y seleccionar los accesorios desbloqueados, para personalizar a Pom de forma sencilla.
95. Como User que deja de entrar, quiero que Pom nunca pase hambre, enferme, muera o me culpabilice, para que regresar siga siendo agradable.
96. Como User, quiero ver a Pom y su estado actual en Home y widgets, para reconocer la continuidad del hábito.

### Streak, horarios y notificaciones

97. Como Pair, quiero elegir una hora diaria para el nuevo Moment, para adaptar el ritual a nuestra rutina.
98. Como Pair en zonas horarias distintas, quiero que el horario se comporte de forma predecible para ambos, para no perder Moments por viajar o vivir lejos.
99. Como User, quiero recibir una notificación cuando el Moment esté disponible, para recordar que hay algo nuevo.
100. Como User, quiero recibir una notificación cuando mi pareja participe, para saber que me está esperando.
101. Como User, quiero recibir una notificación cuando el Moment esté ready, para entrar directamente a Reveal.
102. Como User, quiero recibir un recordatorio antes de que termine la ventana, para poder salvar el día.
103. Como User, quiero que cada notificación me lleve al estado exacto del Moment o Memory, para actuar sin navegar manualmente.
104. Como User, quiero silenciar recordatorios sin desactivar toda la experiencia, para controlar la frecuencia.
105. Como Pair, quiero que el Streak avance solo cuando ambos completemos el Moment, para que represente el hábito conjunto.
106. Como Pair, quiero disponer de una recuperación limitada del Streak, para absorber fallos ocasionales sin eliminar el compromiso.
107. Como Pair, quiero conservar nuestro récord y Memories aunque se rompa el Streak activo, para que el progreso pasado siga teniendo valor.

### Important Dates y Pair space

108. Como User, quiero ver el cumpleaños de mi pareja y el aniversario compartido, para recordar las fechas básicas de la relación.
109. Como Pair, quiero añadir un viaje u otra Important Date personalizada, para anticipar eventos que nos importan.
110. Como User, quiero editar o eliminar una Important Date con permisos comprensibles, para corregir cambios de planes.
111. Como User, quiero ver una cuenta atrás de la siguiente Important Date en el Pair space, para tenerla presente.
112. Como User, quiero poder mostrar una cuenta atrás de Important Date en una superficie de widget cuando esté disponible, para recordarla fuera de la app.

### Widget Family

113. Como User, quiero un widget de estado con Pom, Streak y `te toca`, `esperando`, `ready` o `completado`, para entender el día sin abrir la app.
114. Como User, quiero tocar el widget de estado y llegar al Moment correcto, para actuar inmediatamente.
115. Como User, quiero un widget de Memory con la última Photo o Doodle revelada y, en Photo, la imagen de mi pareja principal y la propia como miniatura, para volver a ver algo compartido.
116. Como User, quiero que el widget visual permanezca neutro hasta que dé consentimiento explícito, para que contenido íntimo no aparezca por sorpresa.
117. Como User, quiero ocultar rápidamente el contenido visual del widget, para recuperar privacidad si cambia mi contexto.
118. Como miembro de una relación a distancia, quiero un widget de distancia aproximada entre nuestras ciudades configuradas, para sentir cercanía sin seguimiento en vivo.
119. Como Pair en la misma ciudad, quiero ver `Juntos` en lugar de una distancia engañosa, para que el estado tenga sentido.
120. Como User, quiero actualizar manualmente mi ciudad y saber que la distancia no es GPS en vivo, para conservar control y expectativas correctas.
121. Como User de iOS, quiero que los widgets se actualicen con estados autorizados y enlaces profundos correctos, para que sean útiles y privados.
122. Como User de Android, quiero una experiencia de widget equivalente en comportamiento y privacidad, para que el valor central no dependa de iPhone.

### Premium y compras

123. Como Pair que acaba de completar el primer Reveal, quiero ver el resultado antes del paywall, para que la monetización no estropee el momento de valor.
124. Como miembro de una Pair, quiero entender que una única suscripción activa Pomelo para los dos, para no pensar que cada uno debe pagar.
125. Como comprador, quiero elegir entre EUR 29.99 al año y EUR 7.99 al mes, para escoger mi nivel de compromiso.
126. Como comprador, quiero que el anual aparezca recomendado con su cobro real claramente indicado, para comparar sin patrones engañosos.
127. Como comprador, quiero ver un equivalente semanal solo como apoyo secundario, para entender el coste sin confundirlo con un plan semanal.
128. Como Pair que cierra el paywall, quiero conservar la primera Memory en Archive Mode, para no sentir que la prueba gratuita era falsa.
129. Como Pair sin Premium después del primer Moment, quiero ver que el siguiente Moment está bloqueado y por qué, para comprender el límite gratuito.
130. Como Subscriber, quiero que mi pareja obtenga Premium sin repetir la compra, para que el producto cumpla la promesa de una suscripción para dos.
131. Como User, quiero restaurar una compra existente, para recuperar Premium después de reinstalar o cambiar de dispositivo.
132. Como Subscriber con un problema temporal de cobro, quiero que el periodo de gracia se refleje correctamente, para no perder acceso de inmediato por un fallo ajeno.
133. Como Pair cuya suscripción caduca, quiero pasar a Archive Mode sin perder Memories permitidas, para conservar nuestra historia.
134. Como Subscriber que se desvincula, quiero conservar la propiedad de Premium y poder aplicarla a una futura Pair, para que la compra siga al pagador.
135. Como segundo miembro, quiero evitar comprar por error si la Pair ya tiene Premium, para no producir pagos duplicados.
136. Como User, quiero abrir la gestión nativa de mi suscripción, para cancelar o cambiar el plan mediante la tienda correspondiente.

### Privacidad, ajustes y soporte

137. Como User, quiero conceder cámara, fotos, notificaciones y ubicación solo cuando una acción lo necesita, para entender cada permiso.
138. Como User, quiero que fotos y dibujos se almacenen de forma privada sin enlaces públicos permanentes, para proteger contenido íntimo.
139. Como User, quiero editar nombre, avatar, fecha de nacimiento, ciudad, hora y preferencias de notificación, para mantener Profile actualizado.
140. Como User, quiero consultar el estado de Pair, Premium y restauración desde ajustes, para resolver dudas sin contactar soporte.
141. Como User, quiero leer política de privacidad y términos desde un lugar accesible, para conocer el tratamiento de mis datos.
142. Como User, quiero contactar soporte desde la app, para resolver problemas de cuenta, Pair o pago.
143. Como User, quiero reportar un Prompt inapropiado, para ayudar a corregir el catálogo sin exponer mi Contribution.
144. Como User, quiero confirmar acciones destructivas y conocer su alcance antes de ejecutarlas, para evitar pérdida accidental.
145. Como User, quiero que borrar mi cuenta, Contribution o ubicación se propague a las superficies derivadas, para que el control de privacidad sea real.

### Contenido, accesibilidad, analítica y operación

146. Como responsable de contenido, quiero mantener una biblioteca inicial de 40-50 Questions, 25-30 Photo Prompts y 25-30 Doodle Prompts, para ofrecer variedad suficiente al lanzamiento.
147. Como responsable de contenido, quiero clasificar cada Prompt por formato, idioma, intimidad y estado activo, para seleccionar contenido apropiado sin un CMS completo.
148. Como Pair, quiero no recibir inmediatamente el mismo Prompt otra vez, para que el ritual no parezca repetitivo.
149. Como User hispanohablante, quiero que copy y Prompts suenen naturales en español, para que la experiencia no parezca traducida de forma literal.
150. Como User, quiero que controles, contraste, tamaños de toque, escalado de texto y lectores de pantalla sean utilizables, para participar con distintas necesidades de accesibilidad.
151. Como equipo de producto, quiero medir el embudo desde cuenta hasta séptimo Moment a nivel Pair, para identificar dónde deja de funcionar la experiencia conjunta.
152. Como equipo de producto, quiero medir invitaciones, activación, formato, Reveal, retención, paywall, compra, restauración y caducidad, para validar producto y negocio.
153. Como User, quiero que la analítica nunca incluya mis respuestas, fotos, dibujos o mensajes, para que medir el producto no exponga contenido privado.
154. Como equipo de producto, quiero distinguir fallos de red, permisos, almacenamiento, Realtime, notificaciones, widgets y compra, para corregir bloqueos de lanzamiento.
155. Como equipo de producto, quiero poder desactivar un Prompt problemático mediante una operación segura, para reaccionar sin publicar una nueva versión de la app.
156. Como tester, quiero recorrer el ciclo completo con dos cuentas y dos dispositivos en iOS y Android, para verificar la experiencia real de una Pair.
157. Como Pair que completa el primer Moment gratuito, quiero ver dentro de la app una preview simulada de Map alimentada por nuestra primera Memory, para comprender el valor futuro sin recibir acceso funcional gratuito.
158. Como Pair que completa el primer Moment gratuito, quiero ver dentro de la app previews simuladas de Widget Family, para entender cómo Pomelo vivirá fuera de la app antes de suscribirme.
159. Como equipo que presenta Pomelo al Shipaton, quiero disponer de una candidata publicada y materiales de demostración que expliquen el ciclo completo aunque la app sea Spanish-first, para poder entregar el proyecto con evidencia real del producto.
160. Como User, quiero usar Pomelo completamente en español o inglés, para que ninguna parte importante de la experiencia aparezca en un idioma que no comprendo.
161. Como User, quiero que Pomelo detecte inicialmente el idioma de mi dispositivo y me permita cambiarlo sin afectar a mi pareja, para controlar mi propia experiencia.
162. Como miembro de una Pair con idiomas distintos, quiero que ambos recibamos el mismo Prompt semántico traducido a nuestro Locale, para compartir realmente el mismo Moment.
163. Como User, quiero que notificaciones, widgets, paywall, errores, fechas, precios y accesibilidad respeten mi Locale, para que la localización sea completa fuera y dentro de la app.
164. Como User, quiero elegir entre seguir el sistema, tema claro y tema oscuro, para adaptar Pomelo a mi preferencia visual.
165. Como User, quiero que todas las pantallas, media, Map, Pom y widgets sigan siendo legibles y privadas en claro y oscuro, para no recibir una experiencia parcial o insegura.

## Implementation Decisions

- El cliente se construirá con Expo SDK 57, React Native, TypeScript y Expo Router para iOS y Android.
- Se usarán development builds desde que entren compras, widgets, configuración real de push u otros módulos nativos; Expo Go seguirá siendo útil solo para superficies compatibles.
- Supabase proporcionará Auth, Postgres, Row Level Security, Storage, Realtime y Edge Functions. Las reglas de servidor y RLS son la autoridad de privacidad y lifecycle.
- La UI consumirá servicios o repositorios de feature en lugar de llamar directamente a Supabase. Esos límites permitirán sustituir el backend por dobles deterministas en pruebas y paralelizar UI y datos.
- RevenueCat será la autoridad de estado de compra de tienda. Webhooks idempotentes proyectarán Premium desde el Subscriber hacia su Pair activa.
- El modelo persistente inicial cubrirá Profile, Pair y membresía, Invitation, Prompt, Moment, Contribution, Reveal/Memory, Thread message, Important Date, Pom Progress, Streak, Premium projection, preferencias de notificación y widgets. Media y documentos derivados se referenciarán desde registros autorizados, no mediante URLs públicas permanentes.
- Las operaciones autoritativas incluirán crear/aceptar/cancelar Invitation, generar el Moment diario, enviar Contribution, finalizar Doodle, ejecutar Reveal con creación exactly-once de Memory, actualizar Progress/Streak, proyectar Premium y aplicar eliminación o unlinking. Las transiciones críticas se ejecutarán en servidor o transacción, no como una secuencia confiada al cliente.
- User, Profile, Pair, Invitation, Moment, Prompt, Contribution, Reveal, Memory, History, Map, Thread, Pom, Streak, Progress, Important Date, Premium, Subscriber, Archive Mode y Widget Family seguirán las definiciones de `CONTEXT.md`.
- Una Pair tendrá exactamente dos miembros para activar el producto y un User no podrá pertenecer a más de una Pair activa.
- Invitation admitirá enlace de aplicación y código alternativo de un solo uso, con estados pending, accepted, cancelled y expired.
- El onboarding del segundo miembro repetirá los datos personales, pero reutilizará datos compartidos ya definidos, como el aniversario.
- Birth date usará el selector nativo de cada plataforma y guardará la fecha completa, incluido el año.
- El avatar será obligatorio. La selección inicial minimizará decisiones mediante una opción generada y un control para obtener otra variación.
- La bienvenida usará una demostración cíclica aproximada de seis segundos: aparece el Moment, llegan las participaciones, ocurre Reveal, Pom reacciona y la tarjeta entra en History. Copy y acciones permanecerán estables.
- El sistema visual mantendrá la identidad original mediante tokens semánticos para claro y oscuro: crema, tinta verde oscura, coral y amarillo son la base de marca, con equivalentes accesibles definidos para superficies oscuras. Bricolage Grotesque se usará para display y Manrope para cuerpo. Cualquier asset temporal de Pom deberá poder sustituirse por el arte final de la diseñadora sin rediseñar las pantallas.
- El lanzamiento estará completamente localizado en español e inglés. Locale pertenece al User, se inicia desde el sistema y admite override manual; no altera el Locale de la pareja.
- Ningún copy User-facing quedará hard-coded. UI, onboarding, errores, notificaciones, widgets, paywall, accesibilidad, fechas, números, precios, términos, privacidad, soporte y metadata de tiendas usarán catálogos localizados completos.
- Un Prompt representará un concepto semántico estable con variantes ES/EN. Ambos miembros reciben el mismo concepto y cada cliente renderiza su variante, evitando que una Pair multilingüe responda a actividades diferentes.
- Appearance pertenece al User y admite `system`, `light` y `dark`. Los componentes consumirán tokens semánticos y todos los modos nativos, media, Map, Pom y widgets mantendrán contraste y privacidad equivalentes.
- La Home se modelará como una superficie de estados, no como pantallas independientes sin relación. Los estados iniciales incluyen `te toca`, `esperando`, `ready` y `revelado`.
- El lifecycle autoritativo será:

  ```text
  scheduled -> open -> partially_submitted -> ready -> revealed -> remembered
                       \-> expired_incomplete

  open/partially_submitted -> recovery -> ready
  ```

- Reveal será una transición atómica, idempotente y Pair-wide. Creará exactamente una Memory en la misma operación autoritativa.
- Question y Photo ocultarán Contribution tanto en UI como en autorización de base de datos y Storage. Un miembro no podrá leer la Contribution ajena antes de Reveal.
- Question admitirá texto corto o selección única A/B/C según el Prompt.
- Photo requerirá una captura trasera y una frontal por miembro, secuenciales y repetibles antes del envío. No se exige captura simultánea ni ventana cronometrada.
- Las cuatro imágenes privadas de una Photo completada se conservarán como fuentes autorizadas y se producirán composiciones derivadas estilo BeReal para Reveal, Memory y widgets.
- Doodle será el único formato colaborativo visible en tiempo real. Tendrá un lienzo compartido, paleta pequeña, grosor, deshacer, borrar y limpiar.
- Los trazos de Doodle se transmitirán por lotes mediante un canal de sesión y se persistirá un documento final; no se insertará cada evento de puntero directamente en Postgres.
- Ambos miembros deberán finalizar Doodle antes de que el Moment quede ready. La Memory solo se creará después de Reveal, igual que en otros formatos.
- Los resultados revelados adoptarán un lenguaje visual de conversación. En Question, la Contribution propia se alineará a la derecha y la de la pareja a la izquierda.
- Thread solo existirá dentro de una Memory revelada y admitirá texto en el MVP. No habrá chat general, media, llamadas, presencia, recibos de lectura ni indicadores complejos.
- History será cronológica y read-only-first. Map solo representará Memories con ciudad aproximada y abrirá su detalle.
- Las ubicaciones serán opcionales, removibles y aproximadas. El widget de distancia usará ciudades configuradas manualmente, no background GPS.
- Media se almacenará de forma privada, se servirá con acceso temporal autorizado y no tendrá URLs públicas permanentes.
- Si un User elimina su Contribution, las referencias compartidas mantendrán una estructura estable con un estado de contenido eliminado.
- Pom usará la referencia `Pom / Original`, una sola etapa física, unas seis expresiones, tres reacciones reutilizables y unos cuatro accesorios desbloqueables.
- Las seis expresiones funcionales serán tranquilo, feliz, emocionado, sorprendido, cariñoso y orgulloso. Las tres reacciones animadas reutilizables serán idle, Reveal y desbloqueo de accesorio.
- La primera Memory presenta a Pom; las Memories 2, 7, 14 y 30 desbloquean respectivamente los cuatro accesorios. Solo una Memory revelada cuenta y Progress nunca disminuye.
- El vestuario permitirá equipar un único accesorio o seleccionar `Sin accesorio`. Cualquiera de los dos miembros puede cambiar el Pom compartido y los accesorios obtenidos no se pierden al romper Streak o expirar Premium.
- Pom no tendrá hambre, enfermedad, tristeza por inactividad, monedas, tienda, habitación, minijuegos, múltiples mascotas ni evolución física completa.
- Streak será Pair-scoped y avanzará solo con Moments completados por ambos. Existirá recuperación limitada sin borrar el récord histórico.
- El horario del Moment será Pair-scoped y la entrega respetará las zonas horarias de ambos miembros con reglas explícitas para cambios de zona.
- Las notificaciones se programarán para disponibilidad, participación de la pareja, estado ready, próximo vencimiento y actividad en Threads. Todas usarán deep links y preferencias por User.
- Important Date cubrirá cumpleaños, aniversario, viaje y fecha personalizada. Alimentará el Pair space y una superficie de cuenta atrás sin crear Memory, Streak o Progress.
- Widget Family tendrá como scope requerido estado, última Memory visual, distancia aproximada e Important Date.
- Los widgets visuales requerirán opt-in, nunca mostrarán contenido antes de Reveal y ofrecerán una forma inmediata de ocultarlo.
- iOS usará la capacidad nativa de widgets disponible en Expo. Android se tratará como una superficie nativa específica y se investigará al inicio por su riesgo de calendario.
- El primer Moment completo, su Reveal, Pom y la primera Memory serán gratuitos y no pedirán tarjeta.
- Después de la primera Memory, Map y Widget Family se explicarán mediante previews simuladas dentro de la app; el acceso funcional seguirá requiriendo Premium.
- El paywall aparecerá después de que el resultado de Reveal sea visible. Cerrar el paywall dejará la Pair en Archive Mode y bloqueará la generación del siguiente Moment.
- Los precios iniciales serán EUR 29.99 anual y EUR 7.99 mensual, sin trial, plan semanal ni counter-offer. El anual será recomendado; cualquier equivalente semanal será texto secundario y no ocultará el cobro real.
- El paywall comunicará `Una suscripción para los dos`, renovación y cancelación, ofrecerá términos, privacidad y restore, y usará `Desbloquear Pomelo para los dos` como CTA principal. Cancelar la renovación conservará Premium hasta finalizar el periodo pagado.
- Premium será propiedad del Subscriber, habilitará a ambos miembros de la Pair activa y seguirá al Subscriber si la Pair se disuelve.
- Restauración, grace period, caducidad, prevención de compra duplicada y proyección al segundo miembro formarán parte del contrato de monetización, no de parches de UI.
- Los permisos se solicitarán en contexto. Cámara y fotos se pedirán al crear Photo; notificaciones al activar recordatorios; ubicación solo al añadirla a una Memory.
- Los Prompts se gestionarán inicialmente como contenido versionado o datos operables con concepto estable, variantes ES/EN, formato, intimidad y estado activo. No se construirá un CMS completo.
- La analítica usará identificadores y eventos de estado, con métricas primarias a nivel Pair. Nunca enviará texto, media, trazos ni mensajes privados.
- Los formatos de evento y lifecycle deberán tolerar reintentos y aplicar claves de idempotencia en Contribution, Reveal, Memory, compras y webhooks.
- El desarrollo se organizará como tracer bullets verticales. La primera ruta real será dos Users -> Invitation -> Pair -> Question -> Contributions ocultas -> Reveal -> Memory -> History.

## Testing Decisions

- Una buena prueba verificará comportamiento observable, autorización y efectos persistidos. No afirmará detalles internos de componentes, nombres de hooks o estructura accidental de consultas.
- La costura principal será una prueba end-to-end con dos Users y dos contextos de dispositivo que recorra creación/aceptación de Invitation, formación de Pair, participación oculta, estado ready, Reveal y creación de Memory. Es la prueba de mayor nivel que demuestra el valor y la privacidad centrales.
- La misma costura se ampliará por formato: Question primero, Photo después y Doodle con una sesión simultánea real o controlada.
- Habrá pruebas de contrato de RLS y Storage que demuestren que un User no puede leer Contributions o media ajenas antes de Reveal, que terceros no pueden acceder a una Pair y que las URLs temporales respetan revocación.
- Habrá pruebas de transición para lifecycle, expiración, recuperación e idempotencia, verificando que los reintentos no duplican Contributions, Reveal, Memories, eventos de Progress ni compras.
- Invitation se probará mediante enlace, código, cancelación, caducidad, reutilización y conflicto con una Pair ya activa.
- Photo se probará en dispositivos o simuladores con permisos concedidos, denegados y revocados; se verificará captura trasera/frontal, repetición, subida privada y composición revelada.
- Doodle se probará con dos clientes, latencia, reconexión, orden de lotes, finalización y persistencia del documento final.
- RevenueCat se probará en sandbox junto con webhooks y proyección de Premium. Los escenarios incluirán compra, restore, compra ya activa, partner access, webhook duplicado o fuera de orden, grace period, expiry y unlink.
- Notificaciones y deep links se probarán en dispositivos reales al menos una vez por plataforma y para cada estado de destino; la lógica de calendario se probará de forma determinista con zonas horarias y cambios de día.
- Widgets se probarán en la frontera nativa: actualización, contenido bloqueado antes de Reveal, opt-in visual, ocultación, datos caducados, logout y deep link. iOS y Android tendrán matrices separadas.
- Eliminación de cuenta, Contribution y ubicación se probará hasta Storage, History, Map, Thread, widgets y analítica derivada.
- Habrá pruebas de accesibilidad para navegación, lectores de pantalla, etiquetas, orden de foco, escalado de texto, contraste y tamaños de toque en los flujos críticos.
- Cada recorrido crítico se ejecutará en español e inglés, incluyendo una Pair con Locales distintos, y se comprobarán fallback, plurales, fechas, precios, textos largos y ausencia de claves sin traducir.
- Cada superficie visual se revisará en claro y oscuro, con preferencia `system`, cambio en caliente, reinicio, contraste, media, Map, Pom, paywall y widgets nativos.
- La matriz mínima de lanzamiento incluirá una versión reciente y una anterior de iOS, una versión reciente y una anterior de Android, dispositivos de tamaños distintos y combinaciones cruzadas iOS-Android dentro de la misma Pair.
- El repositorio actual no contiene prior art de pruebas de producto; por tanto, se creará una única infraestructura de integración de alto nivel alrededor de los límites de servicio, evitando multiplicar seams por feature.
- Los prototipos visuales y mocked data servirán como referencia de estados y regresión visual, pero no contarán como evidencia de lifecycle, privacidad o sincronización.

## Out of Scope

- Terapia de pareja, diagnóstico, consejo clínico o contenido que prometa mejorar una relación de forma garantizada.
- Chat general, llamadas, audio, vídeo, stories públicas, feed social, descubrimiento de parejas o contenido generado por desconocidos.
- Video Moments, audio Moments, sliders, encuestas complejas, predicciones, preguntas multipartes y formatos distintos de Question, Photo y Doodle.
- Captura Photo simultánea obligatoria, ventana cronometrada estilo BeReal, vídeo o composición editable avanzada.
- Capas, stickers, formas, texto, pinceles avanzados o exportación profesional en Doodle.
- Creación manual de Memories antiguas, álbumes importados, edición compleja de History o Map y tarjetas sociales avanzadas.
- Ubicación en vivo, background GPS, distancia en tiempo real o afirmaciones de seguimiento preciso.
- Hambre, salud, tristeza, muerte, culpa, monedas, tienda, habitación, minijuegos, múltiples mascotas o evolución física completa de Pom.
- Micropagos cosméticos en el MVP. Requerirán una decisión de producto y monetización posterior.
- Trial gratuito, suscripción semanal, counter-offer, anuncios o freemium ilimitado.
- CMS completo para Prompts, experimentación remota compleja o personalización algorítmica avanzada.
- Web app para usuarios finales, tablet layout específico, watch app, desktop app y widgets para wearables.
- Localizaciones adicionales a español e inglés y validación completa de idiomas RTL. La arquitectura no debe impedir añadirlas después.
- Garantizar paridad estética perfecta de widgets entre plataformas si las restricciones nativas difieren; sí se exige paridad de privacidad y propósito.
- Temas de color personalizados distintos de las variantes Pomelo clara y oscura.
- Mostrar un Doodle todavía no revelado en un widget o background del sistema. Los widgets solo consumen Memories reveladas.

## Further Notes

- Nombre de producto: Pomelo. Mascota: Pom. La dirección visual elegida es el sistema original ya diseñado, con una identidad cálida, neutra y amable en sus variantes clara y oscura, no excesivamente infantil ni orientada solo a mujeres.
- La promesa central no es `descubrir cuánto os queda por conocer`, sino cuidar la relación mediante una pequeña creación diaria y construir recuerdos que ganan valor juntos.
- El mensaje de bienvenida seguirá refinándose con el producto real. La dirección actual es `Un momento para los dos, cada día`, apoyada por una demostración del ciclo y un CTA simple como `Empezar` o `Empezar la aventura`.
- Los principales hooks de adquisición son Doodle colaborativo, Photo doble cámara, Reveal, widgets privados, History/Map que crecen y las reacciones de Pom. La app debe producir superficies fáciles de grabar para UGC sin diseñar features únicamente para anuncios.
- El plazo objetivo es comenzar el 19 de agosto de 2026 y llegar a una versión publicada a principios de septiembre. Es agresivo. Question end-to-end, privacidad, vinculación, primera Memory y monetización son el primer camino crítico; Android widgets y Map son riesgos de calendario que deben probarse pronto, pero permanecen dentro del MVP acordado.
- El éxito inicial se evaluará por Pair: Invitation aceptada, primer Moment completado por ambos, primer Reveal, segunda y séptima Memory, conversión tras paywall y retención de Pair. Instalaciones y registros individuales son métricas diagnósticas, no la definición de valor.
- El PRD respeta las decisiones de `CONTEXT.md` y ADR-0001 a ADR-0009. Cualquier cambio futuro en Doodle colaborativo, límite gratuito, propiedad de Premium, privacidad de location/widgets, Important Dates, localización, apariencia o naturaleza no punitiva de Pom debe actualizar primero la decisión correspondiente.
