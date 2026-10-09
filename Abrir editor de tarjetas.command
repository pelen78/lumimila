#!/bin/zsh
set -e
cd -- "${0:A:h}"
editor_url='http://127.0.0.1:4173/_tarjetas/#tarjetas'
if /usr/bin/curl --silent --fail --max-time 2 'http://127.0.0.1:4173/_tarjetas/editor.mjs' >/dev/null 2>&1; then
  /usr/bin/open "$editor_url"
  exit 0
fi
node_bin=$(command -v node || true)
if [[ -z "$node_bin" ]]; then
  node_bin='/Users/pelen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
fi
if [[ ! -x "$node_bin" ]]; then
  print 'No se encontró Node.js para abrir el editor.'
  read '?Presiona Enter para cerrar.'
  exit 1
fi
if [[ ! -f '.local/tarjetas/index.html' ]]; then
  print 'Falta la copia privada del editor en .local/tarjetas.'
  read '?Presiona Enter para cerrar.'
  exit 1
fi
"$node_bin" server.mjs &
editor_pid=$!
trap 'kill "$editor_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..30}; do
  if /usr/bin/curl --silent --fail --max-time 1 'http://127.0.0.1:4173/_tarjetas/editor.mjs' >/dev/null 2>&1; then
    /usr/bin/open "$editor_url"
    print 'Lumimila está abierto. Deja esta ventana abierta mientras usas el editor.'
    wait "$editor_pid"
    exit 0
  fi
  if ! kill -0 "$editor_pid" 2>/dev/null; then
    print 'No pudimos iniciar el editor. El puerto 4173 podría estar ocupado.'
    read '?Presiona Enter para cerrar.'
    exit 1
  fi
  sleep 0.2
done
print 'El editor no respondió. Cierra esta ventana y vuelve a intentarlo.'
read '?Presiona Enter para cerrar.'
