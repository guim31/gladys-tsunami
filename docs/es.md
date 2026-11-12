# Alertas de tsunami (NOAA)

Los mensajes oficiales de tsunami de los dos centros de alerta de tsunamis de
la NOAA, para la costa de su casa, en Gladys: el nivel en vigor (mensaje
informativo, advertencia, vigilancia, aviso), el sismo que lo origina y la hora
estimada de llegada de la primera ola cuando el boletín la indica.

> **No es un servicio de alerta oficial.** Lee boletines públicos una vez por
> minuto y puede llegar tarde, equivocarse o callar (red, tsunami.gov,
> Gladys). No sustituye las sirenas, las alertas en el móvil (WEA, ES-Alert),
> la radio NOAA ni las instrucciones de sus autoridades locales. Si siente un
> sismo fuerte cerca de la costa, suba de inmediato a un lugar alto: no espere
> ningún mensaje. Sin afiliación con la NOAA.

## Qué obtiene

- Un dispositivo, **Alerta de tsunami**, para la región seguida:
  - **Nivel de alerta de tsunami** (nivel de riesgo): 0 sin amenaza,
    1 advertencia, 2 vigilancia o mensaje de amenaza internacional, 3 aviso;
  - **Mensaje en vigor**: el tipo del último mensaje, o «Ningún mensaje en
    vigor»;
  - **Magnitud del sismo** y **Sismo** (lugar y hora de origen);
  - **Llegada estimada**: la primera ola en el punto de pronóstico más
    cercano a su casa (300 km como máximo), cuando el boletín indica horas de
    llegada.
- Un disparador de escena para cada nuevo boletín de su región, una acción de
  escena que lee el mensaje en vigor en una frase, y un widget del panel.

## Requisitos

- Gladys Assistant 5.1 o posterior.
- Acceso a Internet desde Gladys a `www.tsunami.gov` (HTTPS). Sin cuenta ni
  clave.
- La ubicación de su casa indicada en Gladys, o coordenadas en la
  configuración, o una región elegida a mano.

## Configuración

1. Instale la integración (Integraciones → Instalar desde GitHub,
   `https://github.com/guim31/gladys-tsunami`).
2. Abra su configuración, revise los ajustes de abajo y guarde.
3. En la pestaña **Descubrir**, cree el dispositivo **Alerta de tsunami**.

### Ajustes

- **Región seguida**: _Automática_ la deduce de su casa. Elíjala a mano si su
  costa está cerca del límite entre dos regiones, o fuera de ellas.
  - Alaska, Columbia Británica y costa oeste de EE. UU. (NTWC);
  - costas este y del golfo de EE. UU., este de Canadá (NTWC);
  - Hawái; Guam e Islas Marianas del Norte; Samoa Americana; Puerto Rico e
    Islas Vírgenes (PTWC);
  - Caribe y Pacífico, mensajes internacionales (PTWC): los mensajes de
    amenaza que el PTWC redacta para las autoridades nacionales de cada país
    de la cuenca (Antillas francesas, Polinesia Francesa, Nueva Caledonia,
    Japón, Chile…).
- **Latitud / longitud de la casa**: deje ambas vacías para usar su casa en
  Gladys. Se acepta la coma decimal.
- **Intervalo de actualización**: 1, 2 o 5 minutos.
- **Idioma de los textos**: nombres del dispositivo y de las funciones (al
  crearlos) y textos enviados a las escenas.

## Niveles y mensajes

| Mensaje (NOAA)                     | Nivel | Significado                                   |
| ---------------------------------- | ----- | --------------------------------------------- |
| Ningún mensaje, información        | 0     | Sin amenaza para su región, o nada en vigor   |
| Advertencia (Advisory)             | 1     | Corrientes y olas fuertes: salga del agua     |
| Vigilancia (Watch)                 | 2     | Un tsunami es posible: esté listo para actuar |
| Mensaje de amenaza (internacional) | 2     | Olas peligrosas previstas en algunas costas   |
| Aviso (Warning)                    | 3     | Tsunami peligroso posible o esperado: evacúe  |
| Cancelación o mensaje final        | 0     | La alerta ha terminado                        |

Una advertencia, una vigilancia, un aviso o un mensaje de amenaza sigue en
vigor hasta el siguiente boletín de la región (actualización, cancelación), o
12 horas sin ningún boletín. Un mensaje informativo o una cancelación se
muestra hasta su vencimiento (una hora), luego «Ningún mensaje en vigor».

## Widget del panel

**Tsunami (NOAA)**: la región, el mensaje en vigor coloreado según el nivel
(verde nada, azul información, naranja advertencia, vigilancia o amenaza, rojo
aviso), el sismo y la llegada estimada, un botón hacia el boletín y la hora de
la última lectura. Ajustes: mostrar el sismo, mostrar el enlace.

## Disparador de escena

**Tsunami: nuevo mensaje de la NOAA**, filtrado por tipo de mensaje
(información, advertencia, vigilancia, aviso, amenaza, cancelación) y por
región. Variables: tipo y región en palabras, nivel, magnitud, lugar del
sismo, llegada estimada, el mensaje en una frase y el enlace al boletín.

Los boletines ya publicados al instalar la integración, o cuando cambia la
región, no disparan nada. Para «el nivel sube» o «la alerta ha terminado»,
también puede usar la función **Nivel de alerta de tsunami** en una condición
de dispositivo.

## Acción de escena

**Tsunami: leer el mensaje en vigor**: devuelve `text` (una frase, para enviar
por mensaje o leer en voz alta), `level` (0 a 3) y `kind` (`none`,
`information`, `advisory`, `watch`, `warning`, `threat`, `cancellation`).

## Ejemplos de escenas

- Disparador _Tsunami: nuevo mensaje de la NOAA_, tipos _Vigilancia_ y
  _Aviso_: enviar la variable `summary` por Telegram y encender todas las
  luces.
- Disparador _Tsunami: nuevo mensaje de la NOAA_, tipo _Cancelación_: enviar
  «Fin de la alerta de tsunami».
- Cada día a las 8:00, si el nivel es 1 o más: leer en voz alta el texto de la
  acción de escena.

## Fuentes de datos, condiciones y cuotas

- `https://www.tsunami.gov/events/js/previous.js` (los 40 últimos boletines
  de ambos centros, uno por producto) y los feeds Atom `PAAQAtom.xml` (NTWC) y
  `PHEBAtom.xml` (PTWC), leídos con `If-Modified-Since`: el sitio responde
  `304 Not Modified` mientras no se publica nada.
- Para cada nuevo boletín de su región, su documento CAP y su boletín de
  texto (dos archivos pequeños).
- Los datos de la NOAA son de dominio público; no se publica ninguna cuota.
  La integración envía un User-Agent con su nombre, como pide la NOAA.

## Solución de problemas

- **«Ninguna región»**: indique la ubicación de su casa en Gladys (Ajustes →
  Casas), o elija la región a mano.
- **«lejos de las costas que cubre la NOAA»**: su casa está fuera de todas las
  regiones; elija la más cercana a mano si quiere sus mensajes.
- **El dispositivo se queda en «Ningún mensaje en vigor»**: es el estado
  normal; la acción **Mostrar el mensaje en vigor** comprueba la última
  lectura.
- Más detalles con `LOG_LEVEL=debug` en los registros de la integración.

## Límites

- La región es una costa entera, no su zona exacta: un aviso para Alaska
  también aparece en una casa de California. Lea el boletín antes de actuar.
- Las horas de llegada solo vienen de los boletines que listan puntos de
  pronóstico con coordenadas (los mensajes de amenaza internacionales). Los
  avisos de EE. UU. dan sus horas en palabras: no se leen.
- El texto de los boletines queda en inglés (las palabras de la NOAA).
- Probada con los boletines reales de tsunami.gov (sismo de Panamá del
  9 de octubre de 2026, mensajes de noviembre de 2026). No hubo ningún aviso
  real de EE. UU. durante su desarrollo: los casos de aviso, vigilancia,
  advertencia y cancelación se derivan de un mensaje real. Sus comentarios son
  bienvenidos.
