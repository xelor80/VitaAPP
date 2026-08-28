import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Minimaler Seed: App-Konfiguration (Score-Gewichte, Tagesziel-Defaults) und
 * ein Start-Set an Health-Rules. KEINE echten personenbezogenen Daten,
 * KEINE erfundenen Messwerte (siehe docs/50).
 */
async function main(): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: 'score_weights' },
    update: {},
    create: {
      key: 'score_weights',
      value: { sleep: 0.25, recovery: 0.25, stress: 0.2, activity: 0.15, cardio: 0.15 },
    },
  });

  await prisma.appConfig.upsert({
    where: { key: 'daily_goals' },
    update: {},
    create: {
      key: 'daily_goals',
      value: { steps: 8000, activeKcal: 500, activeMinutes: 30 },
    },
  });

  // Beispielregel: SpO2 wiederholt niedrig (Werte sind Platzhalter, docs/10).
  const existing = await prisma.healthRule.findFirst({
    where: { metric: 'spo2' },
  });
  if (!existing) {
    await prisma.healthRule.create({
      data: {
        metric: 'spo2',
        definition: {
          condition: { type: 'threshold', operator: 'lt', value: 90 },
          window: { duration_min: 5 },
          occurrences: { count: 3, within: '1d' },
          context: { activity: ['rest'] },
          cooldown: { hours: 12 },
        },
        severity: 'notable',
        notify: true,
        contentKey: {
          title_key: 'alert.spo2.low.title',
          body_key: 'alert.spo2.low.body',
        },
      },
    });
  }

  // Start-Admin (superadmin) – nur anlegen, wenn ENV gesetzt ist.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
    });
    await prisma.adminUser.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {},
      create: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        roles: ['superadmin'],
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Start-Admin ${adminEmail} angelegt (Passwort ändern!).`);
  }

  // eslint-disable-next-line no-console
  console.log('Seed abgeschlossen.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
