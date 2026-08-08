// Datos oficiales de VolleyCoach Hub - CV BUNYOLA (Cadete Femenino 1ª División 2026 - 2027)
// FOTOS DE JUGADORAS EN BLANCO / PENDIENTES DE SUBIR

const TEAM_DATA_VERSION = "319.0";

const DEFAULT_AVATAR = "assets/default_avatar.svg";

function generateRecurringTrainings() {
  const recurring = [];
  const startDate = new Date(2026, 8, 1); // 1 Septiembre 2026
  const endDate = new Date(2027, 3, 30);  // 30 Abril 2027
  let curr = new Date(startDate);
  let counter = 1;

  while (curr <= endDate) {
    const dayOfWeek = curr.getDay(); // 1: Lunes, 3: Miércoles, 5: Viernes
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      recurring.push({
        id: "tr_pista_" + counter,
        title: "Entrenamiento Voleibol (Pista)",
        type: "Entrenamiento",
        date: dateStr,
        time: "18:30 - 20:30",
        location: "Pabellón Municipal de Bunyola",
        status: "Próximo"
      });

      counter++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return recurring;
}

const INITIAL_DATA = {
  version: TEAM_DATA_VERSION,
  teamInfo: {
    name: "CV BUNYOLA",
    category: "Cadete Femenino 1ª División",
    season: "2026 - 2027",
    coach: "Entrenador Principal",
    theme: "gold",
    customLogo: "assets/club_logo.png",
    customBg: "assets/team_banner.jpg",
    wins: 0,
    losses: 0,
    points: 0
  },

  // TABLA DE CLASIFICACIÓN DE LA LIGA (12 EQUIPOS)
  leagueTable: [
    { id: "t1", name: "CV BUNYOLA", logo: "assets/club_logo.png", isOwn: true, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t2", name: "CV Manacor", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t3", name: "CV CIDE", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t4", name: "CV Portocristo", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t5", name: "CV Artà", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t6", name: "CV Sóller", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t7", name: "CV Pòrtol", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t8", name: "CV Mayurqa", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t9", name: "CV Alaró", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t10", name: "CV Esporles", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t11", name: "CV Muro", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 },
    { id: "t12", name: "CV Algaida", logo: "assets/default_avatar.svg", isOwn: false, points: 0, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0 }
  ],

  // LISTADO DE USUARIOS PARA LOGIN, ULTIMA CONEXION Y CAMBIO DE CONTRASEÑA
  users: [
    { username: "admin", password: "123456", name: "Administrador del club", role: "administrator", playerId: null, lastLogin: null },
    { username: "entrenador", password: "123456", name: "Entrenador Principal", role: "coach", playerId: null, lastLogin: null },
    { username: "chidalgo", password: "123456", name: "Carla Hidalgo", role: "player", playerId: "p1", lastLogin: null },
    { username: "aherrezuelo", password: "123456", name: "Aina Herrezuelo", role: "player", playerId: "p2", lastLogin: null },
    { username: "msenor", password: "123456", name: "Maria Señor", role: "player", playerId: "p3", lastLogin: null },
    { username: "apericas", password: "123456", name: "Àngela Pericàs", role: "player", playerId: "p4", lastLogin: null },
    { username: "eruiz", password: "123456", name: "Elena Ruiz", role: "player", playerId: "p5", lastLogin: null },
    { username: "csegui", password: "123456", name: "Catalina Segui", role: "player", playerId: "p6", lastLogin: null },
    { username: "agallent", password: "123456", name: "Alba Gallent", role: "player", playerId: "p7", lastLogin: null },
    { username: "pfuentes", password: "123456", name: "Paula Fuentes", role: "player", playerId: "p8", lastLogin: null },
    { username: "mmarin", password: "123456", name: "Mia Marín", role: "player", playerId: "p9", lastLogin: null },
    { username: "mroca", password: "123456", name: "Mariona Roca", role: "player", playerId: "p10", lastLogin: null },
    { username: "alopez", password: "123456", name: "Auba López", role: "player", playerId: "p11", lastLogin: null },
    { username: "mtorrens", password: "123456", name: "Mar Torrens", role: "player", playerId: "p12", lastLogin: null },
    { username: "gjuan", password: "123456", name: "Gemma Juan", role: "player", playerId: "p13", lastLogin: null },
    { username: "mriera", password: "123456", name: "Mar Riera", role: "player", playerId: "p14", lastLogin: null }
  ],

  // PLANTILLA OFICIAL CON LAS 14 JUGADORAS EXACTAS (FOTOS EN BLANCO PENDIENTES)
  players: [
    {
      id: "p1",
      number: 1,
      name: "Carla Hidalgo",
      username: "chidalgo",
      position: "Colocadora",
      height: "161 cm",
      cmj: "22.57 cm",
      reachAtaque: "22.57 cm (CMJ)",
      reachBloqueo: "20.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "chidalgo@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p2",
      number: 2,
      name: "Aina Herrezuelo",
      username: "aherrezuelo",
      position: "Colocadora",
      height: "171 cm",
      cmj: "26.17 cm",
      reachAtaque: "26.17 cm (CMJ)",
      reachBloqueo: "24.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "aherrezuelo@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p3",
      number: 3,
      name: "Maria Señor",
      username: "msenor",
      position: "Colocadora/Líbero",
      height: "159 cm",
      cmj: "30.05 cm",
      reachAtaque: "30.05 cm (CMJ)",
      reachBloqueo: "27.50 cm",
      birthDate: "2012",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "msenor@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p4",
      number: 4,
      name: "Àngela Pericàs",
      username: "apericas",
      position: "Receptora",
      height: "170 cm",
      cmj: "30.05 cm",
      reachAtaque: "30.05 cm (CMJ)",
      reachBloqueo: "28.00 cm",
      birthDate: "2012",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "apericas@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p5",
      number: 5,
      name: "Elena Ruiz",
      username: "eruiz",
      position: "Receptora",
      height: "165 cm",
      cmj: "24.51 cm",
      reachAtaque: "24.51 cm (CMJ)",
      reachBloqueo: "22.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "eruiz@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p6",
      number: 6,
      name: "Catalina Segui",
      username: "csegui",
      position: "Receptora",
      height: "158 cm",
      cmj: "26.17 cm",
      reachAtaque: "26.17 cm (CMJ)",
      reachBloqueo: "23.50 cm",
      birthDate: "2012",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "csegui@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p7",
      number: 7,
      name: "Alba Gallent",
      username: "agallent",
      position: "Receptora/Líbero",
      height: "160 cm",
      cmj: "26.40 cm",
      reachAtaque: "26.40 cm (CMJ)",
      reachBloqueo: "24.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "agallent@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p8",
      number: 8,
      name: "Paula Fuentes",
      username: "pfuentes",
      position: "Opuesta/Receptora",
      height: "168 cm",
      cmj: "22.57 cm",
      reachAtaque: "22.57 cm (CMJ)",
      reachBloqueo: "20.50 cm",
      birthDate: "2012",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "pfuentes@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p9",
      number: 9,
      name: "Mia Marín",
      username: "mmarin",
      position: "Opuesta",
      height: "169 cm",
      cmj: "29.68 cm",
      reachAtaque: "29.68 cm (CMJ)",
      reachBloqueo: "27.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "mmarin@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p10",
      number: 10,
      name: "Mariona Roca",
      username: "mroca",
      position: "Central",
      height: "170 cm",
      cmj: "34.58 cm",
      reachAtaque: "34.58 cm (CMJ)",
      reachBloqueo: "32.00 cm",
      birthDate: "2012",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "mroca@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p11",
      number: 11,
      name: "Auba López",
      username: "alopez",
      position: "Central",
      height: "172 cm",
      cmj: "32.15 cm",
      reachAtaque: "32.15 cm (CMJ)",
      reachBloqueo: "30.00 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "alopez@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p12",
      number: 12,
      name: "Mar Torrens",
      username: "mtorrens",
      position: "Central",
      height: "172 cm",
      cmj: "34.20 cm",
      reachAtaque: "34.20 cm (CMJ)",
      reachBloqueo: "31.50 cm",
      birthDate: "2011",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "mtorrens@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p13",
      number: 13,
      name: "Gemma Juan",
      username: "gjuan",
      position: "Receptora",
      height: "172 cm",
      cmj: "Pendiente",
      reachAtaque: "Pendiente",
      reachBloqueo: "Pendiente",
      birthDate: "2013",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "gjuan@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    },
    {
      id: "p14",
      number: 14,
      name: "Mar Riera",
      username: "mriera",
      position: "Receptora",
      height: "170 cm",
      cmj: "Pendiente",
      reachAtaque: "Pendiente",
      reachBloqueo: "Pendiente",
      birthDate: "2013",
      status: "Disponible",
      avatar: DEFAULT_AVATAR,
      phone: "",
      email: "mriera@bunyola.com",
      stats: { matches: 0, aces: 0, colocacionesEfectivas: "0%", defensas: 0, puntosTotales: 0 },
      healthNote: ""
    }
  ],

  // 22 JORNADAS OFICIALES PENDIENTES DE DISPUTAR
  events: [
    ...generateRecurringTrainings(),
    { id: "m1", round: 1, title: "Jornada 1: CV BUNYOLA vs Rival 1", type: "Partido", date: "2026-10-03", time: "18:00", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m2", round: 2, title: "Jornada 2: Rival 2 vs CV BUNYOLA", type: "Partido", date: "2026-10-10", time: "17:30", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m3", round: 3, title: "Jornada 3: CV BUNYOLA vs Rival 3", type: "Partido", date: "2026-10-17", time: "19:00", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m4", round: 4, title: "Jornada 4: Rival 4 vs CV BUNYOLA", type: "Partido", date: "2026-10-24", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m5", round: 5, title: "Jornada 5: CV BUNYOLA vs Rival 5", type: "Partido", date: "2026-10-31", time: "18:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m6", round: 6, title: "Jornada 6: Rival 6 vs CV BUNYOLA", type: "Partido", date: "2026-11-07", time: "17:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m7", round: 7, title: "Jornada 7: CV BUNYOLA vs Rival 7", type: "Partido", date: "2026-11-14", time: "18:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m8", round: 8, title: "Jornada 8: Rival 8 vs CV BUNYOLA", type: "Partido", date: "2026-11-21", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m9", round: 9, title: "Jornada 9: CV BUNYOLA vs Rival 9", type: "Partido", date: "2026-11-28", time: "19:00", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m10", round: 10, title: "Jornada 10: Rival 10 vs CV BUNYOLA", type: "Partido", date: "2026-12-05", time: "17:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m11", round: 11, title: "Jornada 11: CV BUNYOLA vs Rival 11", type: "Partido", date: "2026-12-12", time: "18:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m12", round: 12, title: "Jornada 12: Rival 1 vs CV BUNYOLA", type: "Partido", date: "2027-01-09", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m13", round: 13, title: "Jornada 13: CV BUNYOLA vs Rival 2", type: "Partido", date: "2027-01-16", time: "18:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m14", round: 14, title: "Jornada 14: Rival 3 vs CV BUNYOLA", type: "Partido", date: "2027-01-23", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m15", round: 15, title: "Jornada 15: CV BUNYOLA vs Rival 4", type: "Partido", date: "2027-01-30", time: "19:00", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m16", round: 16, title: "Jornada 16: Rival 5 vs CV BUNYOLA", type: "Partido", date: "2027-02-06", time: "17:30", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m17", round: 17, title: "Jornada 17: Rival 6 vs CV BUNYOLA", type: "Partido", date: "2027-02-13", time: "17:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m18", round: 18, title: "Jornada 18: CV BUNYOLA vs Rival 7", type: "Partido", date: "2027-02-20", time: "18:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m19", round: 19, title: "Jornada 19: Rival 8 vs CV BUNYOLA", type: "Partido", date: "2027-02-27", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m20", round: 20, title: "Jornada 20: CV BUNYOLA vs Rival 9", type: "Partido", date: "2027-03-06", time: "19:00", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null },
    { id: "m21", round: 21, title: "Jornada 21: Rival 10 vs CV BUNYOLA", type: "Partido", date: "2027-03-13", time: "18:00", location: "Pabellón Visitante", status: "Próximo", result: null, stats: null },
    { id: "m22", round: 22, title: "Jornada 22: CV BUNYOLA vs Rival 11", type: "Partido", date: "2027-03-20", time: "19:30", location: "Pabellón Municipal de Bunyola", status: "Próximo", result: null, stats: null }
  ],

  wellnessLogs: [],

  rotations: [
    {
      id: "r1",
      name: "P1 (Colocadora en Z1)",
      description: "Colocadora en Z1. Tres atacantes en red (Z4, Z3, Z2).",
      k1_notes: "Recepción en W por Z5 (OH1), Z6 (Líbero) y Z4 (OH2). Colocadora penetra hacia Z2/Z3.",
      k2_notes: "Defensa: Colocadora defiende Z1 paralelo. Bloqueo doble en Z4/Z3.",
      positions: {
        z1: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" },
        z6: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" },
        z5: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" },
        z4: { playerNum: 5, name: "Elena R.", role: "Receptora 2" },
        z3: { playerNum: 10, name: "Mariona R.", role: "Central 1" },
        z2: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" }
      }
    },
    {
      id: "r2",
      name: "P6 (Colocadora en Z6)",
      description: "Colocadora en Z6 trasera central.",
      k1_notes: "Colocadora penetra desde Z6 hacia la red entre Z2 y Z3.",
      k2_notes: "Líbero cubre diagonal Z5, colocadora apoya en centro Z6.",
      positions: {
        z1: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" },
        z6: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" },
        z5: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" },
        z4: { playerNum: 10, name: "Mariona R.", role: "Central 1" },
        z3: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" },
        z2: { playerNum: 5, name: "Elena R.", role: "Receptora 2" }
      }
    },
    {
      id: "r3",
      name: "P5 (Colocadora en Z5)",
      description: "Colocadora en Z5 trasera izquierda.",
      k1_notes: "Pase alto prioritario a Z2/Z3 para dar tiempo a la colocadora.",
      k2_notes: "Recepción en V invertida.",
      positions: {
        z1: { playerNum: 10, name: "Mariona R.", role: "Central 1" },
        z6: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" },
        z5: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" },
        z4: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" },
        z3: { playerNum: 5, name: "Elena R.", role: "Receptora 2" },
        z2: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" }
      }
    },
    {
      id: "r4",
      name: "P4 (Colocadora en Z4 - Delantera)",
      description: "Colocadora delantera en Z4.",
      k1_notes: "Colocadora ya está en red. Opciones principales con Central (Z3) y Receptora (Z2).",
      k2_notes: "Bloqueo lateral directo Z4.",
      positions: {
        z1: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" },
        z6: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" },
        z5: { playerNum: 5, name: "Elena R.", role: "Receptora 2" },
        z4: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" },
        z3: { playerNum: 10, name: "Mariona R.", role: "Central 1" },
        z2: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" }
      }
    },
    {
      id: "r5",
      name: "P3 (Colocadora en Z3 - Delantera)",
      description: "Colocadora en el centro de la red Z3.",
      k1_notes: "Distribución inmediata sin penetración larga.",
      k2_notes: "Bloqueo central o doble ayuda en banda.",
      positions: {
        z1: { playerNum: 5, name: "Elena R.", role: "Receptora 2" },
        z6: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" },
        z5: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" },
        z4: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" },
        z3: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" },
        z2: { playerNum: 10, name: "Mariona R.", role: "Central 1" }
      }
    },
    {
      id: "r6",
      name: "P2 (Colocadora en Z2 - Delantera)",
      description: "Colocadora en Z2 derecha de la red.",
      k1_notes: "Ataque limpio por Z4 y central Z3.",
      k2_notes: "Bloqueo directo sobre atacante principal rival.",
      positions: {
        z1: { playerNum: 3, name: "Maria S.", role: "Líbero (L)" },
        z6: { playerNum: 5, name: "Elena R.", role: "Receptora 2" },
        z5: { playerNum: 9, name: "Mia M.", role: "Opuesta (OP)" },
        z4: { playerNum: 10, name: "Mariona R.", role: "Central 1" },
        z3: { playerNum: 4, name: "Àngela P.", role: "Receptora 1" },
        z2: { playerNum: 1, name: "Carla H.", role: "Colocadora (P)" }
      }
    }
  ],

  // MÓDULO OFICIAL DE PREPARACIÓN FÍSICA Y TEST DE SALTO/FUERZA
  fitnessData: {
    warmup: [
      {
        title: "Movilidad Articular Dinámica",
        duration: "5 min",
        category: "General",
        steps: [
          "Rotaciones de tobillo y rodillas (10 rep/lado)",
          "Movilidad de cadera y apertura de ingle (12 rep)",
          "Circunducciones de hombro con goma o pica (15 rep)",
          "Giro de torso y escápulas activas (10 rep)"
        ]
      },
      {
        title: "Activación Muscular Específica",
        duration: "8 min",
        category: "Voleibol",
        steps: [
          "Caminata en miniband lateral y frontal (15 pasos/lado)",
          "Glute bridge unipodal (10 rep/pierna)",
          "Y-T-W con goma elástica para escápulas (12 rep)",
          "Plancha abdominal con toque de hombro (30 seg)"
        ]
      },
      {
        title: "Desplazamientos y Reactividad",
        duration: "5 min",
        category: "Alta Intensidad",
        steps: [
          "Caídas a 2 pies y salto vertical explosivo (5 rep)",
          "Desplazamiento lateral de bloqueo + batida corta (6 rep)",
          "Aceleraciones cortas a 5m y freno reactivo (4 rep)"
        ]
      }
    ],
    prevention: [
      {
        zone: "Hombro y Manguito Rotador",
        icon: "shield",
        risk: "Tendiditis supraespinoso / Sobrecarga de remate",
        exercises: [
          { name: "Rotación Externa con Goma", series: "3x12", desc: "Codo pegado al costado, tracción externa lenta." },
          { name: "Serrato Antepulsión (Push-up plus)", series: "3x15", desc: "Empuje extra al final de la flexión activando serrato." },
          { name: "Face Pulls con Goma", series: "3x12", desc: "Tirar de la goma a la altura de los ojos retrayendo escápulas." }
        ]
      },
      {
        zone: "Rodilla y Tendón Patelar",
        icon: "activity",
        risk: "Tendinopatía rotuliana / Salto repetido",
        exercises: [
          { name: "Sentadilla Isométrica en Pared (Wall Sit)", series: "3x45s", desc: "Rodillas a 90º sosteniendo tensión en cuádriceps." },
          { name: "Peso Muerto Unipodal (RDL 1 pierna)", series: "3x10", desc: "Control de cadera e isquios en descenso." },
          { name: "Bajar Escalón Excéntrico (Step Down)", series: "3x10", desc: "Descenso controlado en 3 segundos rozando el talón." }
        ]
      },
      {
        zone: "Tobillo e Inestabilidad",
        icon: "footprints",
        risk: "Esguinces por pisada en bloqueo / red",
        exercises: [
          { name: "Equilibrio Unipodal en Bosu/Superficie Blanda", series: "3x40s", desc: "Ojos abiertos/cerrados manteniendo eje estabilizador." },
          { name: "Calf Raises Excéntricos (Elevación de Gemelos)", series: "3x15", desc: "Subir a dos pies, bajar lento a un solo pie." }
        ]
      },
      {
        zone: "Core y Estabilidad Lumbo-Pélvica",
        icon: "disc",
        risk: "Dolor lumbar por hiperextensión en remate",
        exercises: [
          { name: "Deadbug con Anti-extensión", series: "3x12", desc: "Espalda pegada al suelo mientras extiendes brazo/pierna." },
          { name: "Plancha Lateral con Elevación de Pierna", series: "3x30s", desc: "Activación intensa de glúteo medio y oblicuos." }
        ]
      }
    ],
    stretching: [
      {
        title: "Recuperación Cadena Posterior",
        duration: "6 min",
        type: "Post-Entreno",
        exercises: [
          "Estiramiento de isquiotibiales sentado a 1 pierna (40 seg/lado)",
          "Estiramiento de gemelos y sóleo en pared (45 seg/lado)",
          "Piramidal / Glúteo cruzado en suelo (40 seg/lado)"
        ]
      },
      {
        title: "Descompresión Torácica y Hombro",
        duration: "5 min",
        type: "Post-Partido",
        exercises: [
          "Estiramiento Pectoral en marco de puerta (45 seg/lado)",
          "Posición del Niño (Child Pose) abriendo dorsales (1 min)",
          "Rotación Torácica en cuadrúpeda (10 rep/lado)"
        ]
      }
    ],
    jumpStrengthRecords: []
  },

  performanceData: { jumpTests: [] },

  // REGISTRO DE ASISTENCIA A ENTRENAMIENTOS REINICIADO (INICIO DESDE 0)
  attendanceData: [],
  wellnessLogs: [],
  trainingConfirmations: [],
  weeklyGoals: [],
  engagementLedger: [],
  engagementSettings: { wellness: 15, wellnessEarly: 5, attendanceConfirm: 5, trainingAttendance: 20, rpe: 10, goal: 25, perfectWeek: 30 },
  goalSettings: { levelThresholds: [0, 50, 150, 300, 500] },
  events: [],
  trainingRPEs: []
};

function getAppData() {
  const stored = localStorage.getItem("volleycoach_data");
  if (!stored) {
    const fresh = JSON.parse(JSON.stringify(INITIAL_DATA));
    localStorage.setItem("volleycoach_data", JSON.stringify(fresh));
    return fresh;
  }
  try {
    const data = JSON.parse(stored);
    const storedVersion = String(data.version || "");
    data.version = TEAM_DATA_VERSION;

    // Sprint F.2.3: reinicio único de los registros de prueba.
    // Se conservan jugadoras, fotos, fechas de nacimiento, usuarios, club y clasificación.
    if (storedVersion !== TEAM_DATA_VERSION) {
      data.events = [];
      data.attendanceData = [];
      data.wellnessLogs = [];
      data.trainingConfirmations = [];
      data.trainingRPEs = [];
      data.weeklyGoals = [];
      data.engagementLedger = [];
      data.performanceData = { jumpTests: [] };
      if (data.fitnessData) data.fitnessData.jumpStrengthRecords = [];
    }

    if (!data.attendanceData) data.attendanceData = [];
    if (!data.wellnessLogs) data.wellnessLogs = [];
    if (!data.trainingConfirmations) data.trainingConfirmations = [];
    if (!data.trainingRPEs) data.trainingRPEs = [];
    if (!data.weeklyGoals) data.weeklyGoals = [];
    if (!data.engagementLedger) data.engagementLedger = [];
    if (!data.engagementSettings) data.engagementSettings = { wellness: 15, wellnessEarly: 5, attendanceConfirm: 5, trainingAttendance: 20, rpe: 10, goal: 25, perfectWeek: 30 };
    if (!data.goalSettings) data.goalSettings = { levelThresholds: [0, 50, 150, 300, 500] };
    if (!data.fitnessData) {
      data.fitnessData = INITIAL_DATA.fitnessData;
    }
    if (!Array.isArray(data.fitnessData.jumpStrengthRecords)) data.fitnessData.jumpStrengthRecords = [];
    if (!data.performanceData) data.performanceData = { jumpTests: [] };
    if (!Array.isArray(data.performanceData.jumpTests)) data.performanceData.jumpTests = [];

    // Preservar información del club y su logo
    if (!data.teamInfo) {
      data.teamInfo = INITIAL_DATA.teamInfo;
    } else {
      if (!data.teamInfo.customLogo) data.teamInfo.customLogo = INITIAL_DATA.teamInfo.customLogo;
      if (!data.teamInfo.customBg) data.teamInfo.customBg = INITIAL_DATA.teamInfo.customBg;
    }

    // Preservar la clasificación de la liga y los escudos de los equipos (con nombres actualizados)
    if (!data.leagueTable || data.leagueTable.length === 0) {
      data.leagueTable = INITIAL_DATA.leagueTable;
    } else {
      data.leagueTable.forEach(t => {
        if (t.name === "CV Inca") t.name = "CV Algaida";
        if (t.name === "CV Alcúdia") t.name = "CV Muro";
        if (t.name === "CV Son Ferrer") t.name = "CV Alaró";
      });

      INITIAL_DATA.leagueTable.forEach(initT => {
        const storedT = data.leagueTable.find(t => t.id === initT.id || t.name === initT.name);
        if (!storedT) {
          data.leagueTable.push(initT);
        } else {
          if (!storedT.logo) storedT.logo = initT.logo;
        }
      });
    }

    // Preservar usuarios
    if (!data.users || data.users.length === 0) {
      data.users = INITIAL_DATA.users;
    } else {
      INITIAL_DATA.users.forEach(initU => {
        const storedU = data.users.find(u => u.username === initU.username);
        if (!storedU) {
          data.users.push(initU);
        }
      });
    }

    // Preservar jugadoras y sus avatares cargados
    if (!data.players || data.players.length === 0) {
      data.players = INITIAL_DATA.players;
    } else {
      INITIAL_DATA.players.forEach(initP => {
        const storedP = data.players.find(p => p.id === initP.id || p.username === initP.username);
        if (!storedP) {
          data.players.push(initP);
        } else {
          if (!storedP.avatar) storedP.avatar = initP.avatar || DEFAULT_AVATAR;
        }
      });
    }

    // Preservar eventos eliminando los de Pesas / Gimnasio y actualizando el horario de pista a 18:30 - 20:30
    if (data.events && Array.isArray(data.events)) {
      data.events = data.events.filter(e => e.title !== "Pesas" && e.location !== "Gimnasio" && !(e.id && e.id.includes("tr_pesas_")));
      data.events.forEach(e => {
        if (e.type === "Entrenamiento") {
          e.time = "18:30 - 20:30";
          if (e.title === "Entreno Voleibol" || e.title === "Entreno de Pista") {
            e.title = "Entrenamiento Voleibol (Pista)";
          }
        }
      });
    } else {
      data.events = [];
    }

    localStorage.setItem("volleycoach_data", JSON.stringify(data));
    return data;
  } catch (e) {
    console.error("No se pudieron leer los datos guardados:", e);
    const backup = localStorage.getItem("volleycoach_data_backup");
    if (backup) {
      try { return JSON.parse(backup); } catch (_) {}
    }
    const fresh = JSON.parse(JSON.stringify(INITIAL_DATA));
    try { localStorage.setItem("volleycoach_data", JSON.stringify(fresh)); } catch (_) {}
    return fresh;
  }
}

function clearUnsavedDraft() {
  try {
    localStorage.removeItem("volleycoach_unsaved_draft");
    localStorage.removeItem("volleycoach_unsaved_draft_meta");
    if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("saved");
  } catch (e) {}
}
window.clearUnsavedDraft = clearUnsavedDraft;

function saveAppData(data, options = {}) {
  try {
    const serialized = JSON.stringify(data);
    const previous = localStorage.getItem("volleycoach_data");
    if (previous === serialized) {
      localStorage.removeItem("volleycoach_unsaved_draft");
      localStorage.removeItem("volleycoach_unsaved_draft_meta");
      if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("saved");
      return true;
    }

    const now = Date.now();
    localStorage.setItem("volleycoach_unsaved_draft", serialized);
    localStorage.setItem("volleycoach_unsaved_draft_meta", JSON.stringify({ savedAt: now, version: TEAM_DATA_VERSION }));
    if (typeof window.markAppChangesPending === "function") window.markAppChangesPending();

    const commit = () => {
      try {
        const current = localStorage.getItem("volleycoach_data");
        const lastBackup = Number(sessionStorage.getItem("volleycoach_last_backup") || 0);
        if (current && Date.now() - lastBackup > 30000) {
          localStorage.setItem("volleycoach_data_backup", current);
          sessionStorage.setItem("volleycoach_last_backup", String(Date.now()));
        }
        if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("saving");
        localStorage.setItem("volleycoach_data", serialized);
        localStorage.setItem("volleycoach_last_saved_at", new Date().toISOString());
        localStorage.removeItem("volleycoach_unsaved_draft");
        localStorage.removeItem("volleycoach_unsaved_draft_meta");
        window.__appDataRevision = Number(window.__appDataRevision || 0) + 1;
        if (typeof window.invalidateViewRenderCache === "function") window.invalidateViewRenderCache();
        if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("saved");
      } catch (error) {
        console.error("No se han podido guardar los datos:", error);
        if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("error");
        if (typeof showToast === "function") showToast("No se pudieron guardar los datos.", "error");
      }
    };

    clearTimeout(window.__volleySaveTimer);
    window.__volleyPendingCommit = commit;
    window.__volleySaveTimer = setTimeout(commit, options.immediate ? 0 : 700);
    return true;
  } catch (error) {
    console.error("No se han podido preparar los datos para guardar:", error);
    if (typeof window.updateSaveStatus === "function") window.updateSaveStatus("error");
    return false;
  }
}

function flushAppDataSave() {
  if (typeof window.__volleyPendingCommit === "function") {
    clearTimeout(window.__volleySaveTimer);
    const commit = window.__volleyPendingCommit;
    window.__volleyPendingCommit = null;
    commit();
  }
}
window.flushAppDataSave = flushAppDataSave;

