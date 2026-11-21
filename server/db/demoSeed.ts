import { db } from './index.ts';
import { initDb } from './schema.ts';

export function seedDemoData(force = false) {
  initDb();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM trips').get() as { count: number };
  if (countRow.count > 0 && !force) {
    console.log('[DemoSeed] Database already has trips. Skipping demo seed.');
    return;
  }

  console.log('[DemoSeed] Seeding sample demo trips, chronicles, and numismatic pieces...');

  const insertTrip = db.prepare(`
    INSERT OR REPLACE INTO trips (
      id, title, country_code, city, start_date, end_date,
      cover_image, status, summary, total_cost, cost_currency,
      inclusions, cost_notes, temp_min, temp_max
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT OR REPLACE INTO trip_logs (
      id, trip_id, day_number, log_date, title,
      notes_partner_1, notes_partner_2, photos
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertArtifact = db.prepare(`
    INSERT OR REPLACE INTO artifacts (
      id, trip_id, collector_profile_id, category, title,
      currency_code, denomination, year, image_front, image_back, story
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Trip 1: Japón
  insertTrip.run(
    'demo-trip-japan',
    'Aventura en Japón: De Neón a Santuarios',
    'JP',
    'Tokio y Kioto',
    '2024-04-05',
    '2024-04-18',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
    'completed',
    'Una inmersión inolvidable entre rascacielos iluminados, templos milenarios de madera, cerezos tardíos y la mejor gastronomía ramen.',
    3450,
    'EUR',
    '✈️ Vuelos,🏨 Hotel / Alojamiento,🚆 Tren / Bus,🎟️ Entradas / Tours,🛡️ Seguro de viaje',
    'Incluye JR Pass de 7 días y hoteles céntricos en Shinjuku y Gion.',
    8.2,
    21.5
  );

  insertLog.run(
    'demo-log-japan-1',
    'demo-trip-japan',
    1,
    '2024-04-06',
    'Llegada a Shinjuku y primer ramen bajo la lluvia',
    'Impresionante salir de la estación de Shinjuku y ver los carteles de neón reflejados en el asfalto mojado. El caldo tonkotsu del callejón Omoide Yokocho fue reconstituyente tras 14 horas de vuelo.',
    'Parecía que estábamos dentro de una película de anime. La amabilidad de la gente guiándonos con paraguas transparentes fue el mejor recibimiento.',
    JSON.stringify([])
  );

  insertLog.run(
    'demo-log-japan-2',
    'demo-trip-japan',
    3,
    '2024-04-08',
    'Santuario Fushimi Inari al amanecer',
    'Subir los miles de toriis rojos a las 6:30 AM antes de que llegasen las masas valió cada minuto de sueño sacrificado.',
    'El silencio entre los cedros del monte Inari y el olor a incienso hacían que pareciese un lugar sagrado suspendido en el tiempo.',
    JSON.stringify([])
  );

  // Banknotes & Coins for Japan
  insertArtifact.run(
    'demo-artifact-jpy-1000',
    'demo-trip-japan',
    'profile_1',
    'banknote',
    '1.000 JPY (Hideyo Noguchi / Monte Fuji)',
    'JPY',
    '1000',
    2004,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/1000_yen_Series_E_2004.jpg/800px-1000_yen_Series_E_2004.jpg',
    null,
    'Conseguido en el primer cambio de divisa en el aeropuerto de Haneda.'
  );

  insertArtifact.run(
    'demo-artifact-jpy-5000',
    'demo-trip-japan',
    'profile_2',
    'banknote',
    '5.000 JPY (Ichiyo Higuchi)',
    'JPY',
    '5000',
    2004,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/5000_yen_Series_E_2004.jpg/800px-5000_yen_Series_E_2004.jpg',
    null,
    'El billete lila que guardamos como recuerdo de los paseos nocturnos por Kioto.'
  );

  insertArtifact.run(
    'demo-artifact-jpy-5',
    'demo-trip-japan',
    'profile_1',
    'coin',
    '5 Yen (Go-en de la Buena Fortuna)',
    'JPY',
    '5',
    2024,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/5_yen_coin_heisei.jpg/640px-5_yen_coin_heisei.jpg',
    null,
    'La moneda con el agujero en el centro que se ofrece en los templos sintoístas para llamar a los buenos lazos y la suerte.'
  );

  // Trip 2: Roma
  insertTrip.run(
    'demo-trip-rome',
    'Escapada Eterna a Roma',
    'IT',
    'Roma',
    '2023-10-12',
    '2023-10-16',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    'completed',
    'Paseos interminables entre ruinas imperiales, heladerías artesanales y las mejores pastas carbonara del Trastevere.',
    1180,
    'EUR',
    '✈️ Vuelos,🏨 Hotel / Alojamiento,🍽️ Desayuno / TI,🎟️ Entradas / Tours',
    'Vuelos directos y bed & breakfast con encanto en Trastevere.',
    14.1,
    24.8
  );

  insertLog.run(
    'demo-log-rome-1',
    'demo-trip-rome',
    1,
    '2023-10-12',
    'Atardecer en el Coliseo y cena en Trastevere',
    'La luz dorada del atardecer cayendo sobre la piedra del Coliseo te deja sin palabras. Luego caminamos hasta Trastevere para una carbonara auténtica sin nata.',
    'Perderse por los callejones adoquinados con hiedra de Trastevere y terminar cenando en una mesita en la calle con música de violín de fondo fue perfecto.',
    JSON.stringify([])
  );

  insertArtifact.run(
    'demo-artifact-eur-2',
    'demo-trip-rome',
    'profile_2',
    'coin',
    '2 Euro Conmemorativa (Coliseo Romano)',
    'EUR',
    '2',
    2023,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2_Euro_Italy_Colosseum.jpg/640px-2_Euro_Italy_Colosseum.jpg',
    null,
    'Moneda conmemorativa recibida como cambio en una heladería cerca de la Fontana di Trevi.'
  );

  console.log('✅ [DemoSeed] Demo data loaded successfully.');
}

if (process.argv[1]?.endsWith('demoSeed.ts') || process.env.RUN_SEED === 'true') {
  seedDemoData(true);
}
