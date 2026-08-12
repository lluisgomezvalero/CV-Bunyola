from pathlib import Path

app = Path('app.js')
text = app.read_text()
old = '''    const file = e.target.files[0];
    if (!file || !activePlayerIdForAvatar) return;

    compressAndResizeImage(file, 400, 400, 0.85, (dataUrl) => {
      const player = appState.players.find(p => p.id === activePlayerIdForAvatar);'''
new = '''    const file = e.target.files[0];
    if (!file || !activePlayerIdForAvatar) return;

    // Capturamos la jugadora y su foto anterior antes de comprimir.
    // La sincronización con Supabase se dispara desde este mismo flujo,
    // evitando depender de listeners paralelos o del orden de eventos del navegador.
    const targetPlayerId = activePlayerIdForAvatar;
    const playerBeforeAvatarChange = appState.players.find(p => p.id === targetPlayerId);
    const previousAvatar = String(playerBeforeAvatarChange?.avatar || '');

    compressAndResizeImage(file, 400, 400, 0.85, (dataUrl) => {
      const player = appState.players.find(p => p.id === targetPlayerId);'''
if text.count(old) != 1:
    raise SystemExit(f'Unexpected avatar listener start count: {text.count(old)}')
text = text.replace(old, new, 1)

old2 = '''        renderRoster();
        renderNavUserProfile();
        showToast(`¡Foto de ${player.name} actualizada con éxito!`);'''
new2 = '''        renderRoster();
        renderNavUserProfile();

        // Supabase es la copia autoritativa de las fotos de Plantilla.
        if (typeof window.syncPlayerAvatarToSupabase === 'function') {
          void window.syncPlayerAvatarToSupabase(player, file, previousAvatar);
        } else {
          console.error('[PlayerAvatar] La capa de sincronización no está disponible.');
          showToast('La foto se ha cambiado solo en este dispositivo. Recarga e inténtalo de nuevo.', 'error');
        }
        showToast(`¡Foto de ${player.name} actualizada con éxito!`);'''
if text.count(old2) != 1:
    raise SystemExit(f'Unexpected avatar listener finish count: {text.count(old2)}')
text = text.replace(old2, new2, 1)
app.write_text(text)

avatar = Path('player-avatar-authoritative-20260812.js')
av = avatar.read_text()
if 'bindDelegatedRosterCapture();' not in av:
    raise SystemExit('Delegated avatar capture hook not found')
av = av.replace('  bindDelegatedRosterCapture();\n', '  // La subida se invoca directamente desde initPlayerAvatarUploadListener.\n', 1)
avatar.write_text(av)

cfg = Path('supabase-config.js')
c = cfg.read_text()
if "window.VOLLEY_ASSET_VERSION = '20260812s';" not in c:
    raise SystemExit('Expected cache version s not found')
c = c.replace("window.VOLLEY_ASSET_VERSION = '20260812s';", "window.VOLLEY_ASSET_VERSION = '20260812t';", 1)
c = c.replace("player-avatar-authoritative-20260812.js?v=20260812s", "player-avatar-authoritative-20260812.js?v=20260812t", 1)
cfg.write_text(c)

idx = Path('index.html')
i = idx.read_text()
for name in ['styles.css','supabase-config.js','supabase-client.js','data.js','app.js']:
    i = i.replace(f'{name}?v=20260812s', f'{name}?v=20260812t')
idx.write_text(i)
