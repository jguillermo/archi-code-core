# language: es
# Contexto: <Bounded Context>
# Validado por: <experto> el <DD/MM/AAAA>  (o "por validar")

Característica: <capacidad del dominio con palabras del lenguaje ubicuo>

  # Escenario en prosa, refinado con: ¿quién?, ¿qué debe ser cierto antes?, ¿quién se entera?
  # <texto del escenario>

  Escenario: <acción del lenguaje ubicuo, caso principal>
    Dado <estado previo con datos realistas>
    Y <otra condición previa>
    Cuando <comando con quien lo ejecuta>
    Entonces <estado resultante>
    Y se registra el evento <EventoEnPasado>

  Escenario: <la misma acción cuando no se cumple una condición>
    Dado <estado previo que incumple la regla>
    Cuando <comando>
    Entonces se rechaza con <motivo con nombre de negocio>
    Y no se registra ningún evento
