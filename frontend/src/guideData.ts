// VitaGuide+ Health Companion Guide Data
// All guide texts organized by screen route, bilingual (DE/IT)

import { Lang } from './i18n';

export interface GuideQuickAction {
  id: string;
  label: { de: string; it: string };
  response: { de: string; it: string };
}

// Mascot pose types matching the available VERO images
export type MascotPose = 'default' | 'hallo' | 'super' | 'achtung' | 'herz';

export interface GuideScreenData {
  greeting: { de: string; it: string };
  explanation: { de: string; it: string };
  nextStep: { de: string; it: string };
  pose: MascotPose;         // which VERO pose to show for this screen
  quickActions: GuideQuickAction[];
}

export interface OnboardingStep {
  id: string;
  title: { de: string; it: string };
  text: { de: string; it: string };
  icon: string;
  pose: MascotPose;
}

// Onboarding Tour Steps (first-time users)
export const ONBOARDING_TOUR: OnboardingStep[] = [
  {
    id: 'welcome',
    title: { de: 'Willkommen bei VitaGuide+', it: 'Benvenuto su VitaGuide+' },
    text: {
      de: 'Ich bin Ihr persoenlicher Gesundheitsbegleiter. Ich helfe Ihnen, die App zu verstehen und das Beste aus Ihren Gesundheitsdaten herauszuholen.',
      it: 'Sono il vostro accompagnatore sanitario personale. Vi aiuto a comprendere l\'app e a ottenere il massimo dai vostri dati sanitari.',
    },
    icon: 'hand-wave',
    pose: 'hallo',
  },
  {
    id: 'health_score',
    title: { de: 'Ihr Health Score', it: 'Il vostro Health Score' },
    text: {
      de: 'Der Health Score zeigt Ihnen auf einen Blick, wie es um Ihre Gesundheit steht. Er basiert auf Ihrem Profil, Ihren Symptomen und Ihrer Supplement-Einnahme.',
      it: 'L\'Health Score vi mostra a colpo d\'occhio come sta la vostra salute. Si basa sul vostro profilo, sui sintomi e sull\'assunzione di integratori.',
    },
    icon: 'heart-pulse',
    pose: 'achtung',
  },
  {
    id: 'supplement_plan',
    title: { de: 'Ihr Supplement-Plan', it: 'Il vostro piano integratori' },
    text: {
      de: 'Im Supplement-Plan finden Sie Ihre personalisierten Empfehlungen fuer 8 Wochen. Tippen Sie auf Supplements, um Produkte zu vergleichen.',
      it: 'Nel piano integratori trovate le vostre raccomandazioni personalizzate per 8 settimane. Toccate gli integratori per confrontare i prodotti.',
    },
    icon: 'pill',
    pose: 'achtung',
  },
  {
    id: 'tracking',
    title: { de: 'Fortschritt tracken', it: 'Monitorare i progressi' },
    text: {
      de: 'Unter Fortschritt koennen Sie taeglich Schlaf, Energie und Wohlbefinden dokumentieren. So sehen Sie, wie sich Ihre Werte entwickeln.',
      it: 'Nella sezione progressi potete documentare quotidianamente sonno, energia e benessere. Cosi vedete come si sviluppano i vostri valori.',
    },
    icon: 'chart-line',
    pose: 'super',
  },
  {
    id: 'reminders',
    title: { de: 'Erinnerungen', it: 'Promemoria' },
    text: {
      de: 'Aktivieren Sie Erinnerungen in Ihrem Supplement-Plan, damit Sie keine Einnahme vergessen. Sie koennen Zeiten und Schichtplaene anpassen.',
      it: 'Attivate i promemoria nel vostro piano integratori per non dimenticare l\'assunzione. Potete adattare orari e turni di lavoro.',
    },
    icon: 'bell-ring',
    pose: 'super',
  },
];

// Screen-specific guide data
export const GUIDE_SCREENS: Record<string, GuideScreenData> = {
  '/': {
    greeting: {
      de: 'Hier sehen Sie Ihren aktuellen Health Score und die wichtigsten Aufgaben fuer heute.',
      it: 'Qui vedete il vostro Health Score attuale e i compiti piu importanti per oggi.',
    },
    explanation: {
      de: 'Der Startscreen zeigt Ihnen eine Uebersicht Ihres Gesundheitszustands. Scrollen Sie nach unten, um Ihre taeglichen Aufgaben, Preisalarme und Achievements zu sehen.',
      it: 'La schermata iniziale vi mostra una panoramica del vostro stato di salute. Scorrete verso il basso per vedere i compiti giornalieri, gli avvisi di prezzo e i risultati.',
    },
    nextStep: {
      de: 'Starten Sie mit Ihrem Gesundheitsprofil, um personalisierte Empfehlungen zu erhalten.',
      it: 'Iniziate con il vostro profilo sanitario per ricevere raccomandazioni personalizzate.',
    },
    pose: 'hallo',
    quickActions: [
      {
        id: 'explain_home',
        label: { de: 'Was sehe ich hier?', it: 'Cosa vedo qui?' },
        response: {
          de: 'Der Startscreen zeigt Ihren Health Score, taegliche Aufgaben, Preisalarme und Achievements. Nutzen Sie die Karten oben, um zu den einzelnen Bereichen zu navigieren.',
          it: 'La schermata iniziale mostra il vostro Health Score, compiti giornalieri, avvisi di prezzo e risultati. Usate le schede in alto per navigare nelle singole aree.',
        },
      },
      {
        id: 'next_step_home',
        label: { de: 'Was sollte ich als Naechstes tun?', it: 'Cosa dovrei fare dopo?' },
        response: {
          de: 'Wenn Sie noch kein Gesundheitsprofil haben, starten Sie dort. Falls Sie schon eines haben, checken Sie Ihre taeglichen Aufgaben oder starten Sie eine neue Symptomanalyse.',
          it: 'Se non avete ancora un profilo sanitario, iniziate da li. Se ne avete gia uno, controllate i compiti giornalieri o avviate una nuova analisi dei sintomi.',
        },
      },
    ],
  },

  '/health-profile': {
    greeting: {
      de: 'Hier wird Ihr persoenliches Gesundheitsprofil ausgewertet.',
      it: 'Qui viene valutato il vostro profilo sanitario personale.',
    },
    explanation: {
      de: 'Ihr Gesundheitsprofil beruecksichtigt Alter, Geschlecht, Lebensstil, Ernaehrung und mehr. Diese Werte beeinflussen alle Ihre Empfehlungen und Risikobewertungen.',
      it: 'Il vostro profilo sanitario considera eta, sesso, stile di vita, alimentazione e altro. Questi valori influenzano tutte le raccomandazioni e le valutazioni di rischio.',
    },
    nextStep: {
      de: 'Aktualisieren Sie Ihr Profil regelmaessig, um genauere Empfehlungen zu erhalten.',
      it: 'Aggiornate regolarmente il vostro profilo per ricevere raccomandazioni piu precise.',
    },
    pose: 'achtung',
    quickActions: [
      {
        id: 'explain_profile',
        label: { de: 'Was beeinflusst mein Profil?', it: 'Cosa influenza il mio profilo?' },
        response: {
          de: 'Ihr Profil beruecksichtigt persoenliche Daten, Lebensstil (inkl. Arbeitstyp und Schichtarbeit), Ernaehrungsgewohnheiten, Allergien und bestehende Beschwerden.',
          it: 'Il vostro profilo considera dati personali, stile di vita (incl. tipo di lavoro e turni), abitudini alimentari, allergie e disturbi esistenti.',
        },
      },
    ],
  },

  '/results': {
    greeting: {
      de: 'Hier sind Ihre Analyseergebnisse mit personalisierten Empfehlungen.',
      it: 'Ecco i risultati della vostra analisi con raccomandazioni personalizzate.',
    },
    explanation: {
      de: 'Die Analyse beruecksichtigt Ihre Symptome und Ihr Gesundheitsprofil. Sie finden Naehrstoff-Risikobewertungen, Supplement-Empfehlungen, Ernaehrungstipps und passende Rezepte.',
      it: 'L\'analisi considera i vostri sintomi e il profilo sanitario. Trovate valutazioni di rischio nutrizionale, raccomandazioni di integratori, consigli alimentari e ricette adatte.',
    },
    nextStep: {
      de: 'Wechseln Sie zwischen den Tabs, um alle Empfehlungen zu sehen. Tippen Sie auf Produkte, um Preise zu vergleichen.',
      it: 'Passate tra le schede per vedere tutte le raccomandazioni. Toccate i prodotti per confrontare i prezzi.',
    },
    pose: 'super',
    quickActions: [
      {
        id: 'explain_risk',
        label: { de: 'Was bedeuten die Risikostufen?', it: 'Cosa significano i livelli di rischio?' },
        response: {
          de: 'Rot (HOCH) bedeutet dringenden Handlungsbedarf, Gelb (MITTEL) empfohlene Aufmerksamkeit und Gruen (NIEDRIG) ausreichende Versorgung. Die Stufen basieren auf Ihren Symptomen und Ihrem Profil.',
          it: 'Rosso (ALTO) significa necessita urgente di azione, Giallo (MEDIO) attenzione consigliata e Verde (BASSO) fornitura sufficiente. I livelli si basano sui sintomi e sul profilo.',
        },
      },
      {
        id: 'why_recommended',
        label: { de: 'Warum wird mir das empfohlen?', it: 'Perche mi viene consigliato?' },
        response: {
          de: 'Die Empfehlungen basieren auf der KI-Analyse Ihrer Symptome, kombiniert mit Ihrem persoenlichen Gesundheitsprofil. Jede Empfehlung ist individuell auf Ihre Situation abgestimmt.',
          it: 'Le raccomandazioni si basano sull\'analisi AI dei vostri sintomi, combinata con il profilo sanitario personale. Ogni raccomandazione e personalizzata per la vostra situazione.',
        },
      },
    ],
  },

  '/supplement-plan': {
    greeting: {
      de: 'Hier finden Sie Ihren strukturierten Einnahmeplan fuer die naechsten Wochen.',
      it: 'Qui trovate il vostro piano di assunzione strutturato per le prossime settimane.',
    },
    explanation: {
      de: 'Der 8-Wochen-Plan zeigt Ihnen genau, welche Supplements Sie zu welcher Tageszeit einnehmen sollten. Tippen Sie auf die Icons, um passende Produkte zu vergleichen.',
      it: 'Il piano di 8 settimane vi mostra esattamente quali integratori assumere in quale momento della giornata. Toccate le icone per confrontare i prodotti adatti.',
    },
    nextStep: {
      de: 'Aktivieren Sie Erinnerungen, um keine Einnahme zu vergessen. Sie finden die Einstellungen unten im Plan.',
      it: 'Attivate i promemoria per non dimenticare l\'assunzione. Trovate le impostazioni in fondo al piano.',
    },
    pose: 'achtung',
    quickActions: [
      {
        id: 'explain_plan',
        label: { de: 'Wie funktioniert mein Plan?', it: 'Come funziona il mio piano?' },
        response: {
          de: 'Der Plan verteilt Ihre Supplements optimal ueber den Tag: Morgens, Mittags, Abends. Er beruecksichtigt Wechselwirkungen und optimale Einnahmezeitpunkte.',
          it: 'Il piano distribuisce i vostri integratori in modo ottimale durante la giornata: Mattina, Mezzogiorno, Sera. Considera le interazioni e i momenti di assunzione ottimali.',
        },
      },
      {
        id: 'shift_work',
        label: { de: 'Was ist der Schichtplan?', it: 'Cos\'e il piano turni?' },
        response: {
          de: 'Wenn Sie in Schichtarbeit taetig sind, passt der Schichtplan Ihre Erinnerungen automatisch an Ihren Wochenrhythmus an. Konfigurieren Sie dies unter Erinnerungen.',
          it: 'Se lavorate a turni, il piano turni adatta automaticamente i promemoria al vostro ritmo settimanale. Configuratelo nella sezione promemoria.',
        },
      },
    ],
  },

  '/tracking': {
    greeting: {
      de: 'Hier sehen Sie, wie sich Schlaf, Energie und Wohlbefinden entwickeln.',
      it: 'Qui vedete come si sviluppano sonno, energia e benessere.',
    },
    explanation: {
      de: 'Das Tracking zeigt Ihnen Ihre taeglichen Werte im Zeitverlauf. Regelmaessiges Dokumentieren hilft, Muster zu erkennen und den Fortschritt zu messen.',
      it: 'Il tracking vi mostra i vostri valori giornalieri nel tempo. Documentare regolarmente aiuta a riconoscere modelli e misurare i progressi.',
    },
    nextStep: {
      de: 'Tragen Sie taeglich Ihre Werte ein. Je mehr Daten, desto bessere Einblicke.',
      it: 'Inserite quotidianamente i vostri valori. Piu dati avete, migliori saranno le informazioni.',
    },
    pose: 'super',
    quickActions: [
      {
        id: 'explain_tracking',
        label: { de: 'Was sollte ich tracken?', it: 'Cosa dovrei monitorare?' },
        response: {
          de: 'Tracken Sie taeglich Schlafqualitaet, Energielevel und allgemeines Wohlbefinden. Zusaetzlich koennen Sie Symptome und Notizen hinzufuegen.',
          it: 'Monitorate quotidianamente qualita del sonno, livello di energia e benessere generale. Inoltre potete aggiungere sintomi e note.',
        },
      },
    ],
  },

  '/progress': {
    greeting: {
      de: 'Hier sehen Sie Ihren Gesundheitsfortschritt im Zeitverlauf.',
      it: 'Qui vedete i vostri progressi sanitari nel tempo.',
    },
    explanation: {
      de: 'Die Fortschrittsansicht zeigt Trends und Entwicklungen Ihrer Gesundheitsdaten. Nutzen Sie die Grafiken, um positive Veraenderungen zu erkennen.',
      it: 'La vista progressi mostra tendenze e sviluppi dei vostri dati sanitari. Usate i grafici per riconoscere cambiamenti positivi.',
    },
    nextStep: {
      de: 'Vergleichen Sie Ihre Werte ueber verschiedene Zeitraeume, um Trends zu erkennen.',
      it: 'Confrontate i vostri valori su diversi periodi per riconoscere le tendenze.',
    },
    pose: 'herz',
    quickActions: [],
  },

  '/recipes-catalog': {
    greeting: {
      de: 'Entdecken Sie gesunde Rezepte, die zu Ihrem Profil passen.',
      it: 'Scoprite ricette sane adatte al vostro profilo.',
    },
    explanation: {
      de: 'Die Rezepte werden basierend auf Ihrem Gesundheitsprofil sortiert. Rezepte mit hoher Relevanz erscheinen zuerst.',
      it: 'Le ricette vengono ordinate in base al vostro profilo sanitario. Le ricette con alta rilevanza appaiono per prime.',
    },
    nextStep: {
      de: 'Filtern Sie nach Kategorien oder suchen Sie nach bestimmten Zutaten.',
      it: 'Filtrate per categorie o cercate ingredienti specifici.',
    },
    pose: 'herz',
    quickActions: [
      {
        id: 'explain_recipes',
        label: { de: 'Wie werden Rezepte sortiert?', it: 'Come vengono ordinate le ricette?' },
        response: {
          de: 'Rezepte werden per KI nach Relevanz fuer Ihr Gesundheitsprofil sortiert. Ihre Allergien, Ernaehrungsgewohnheiten und Naehrstoffbeduerfnisse werden beruecksichtigt.',
          it: 'Le ricette vengono ordinate dall\'AI per rilevanza rispetto al vostro profilo sanitario. Si considerano allergie, abitudini alimentari e fabbisogno nutrizionale.',
        },
      },
    ],
  },

  '/onboarding': {
    greeting: {
      de: 'Hier erstellen Sie Ihr persoenliches Gesundheitsprofil.',
      it: 'Qui create il vostro profilo sanitario personale.',
    },
    explanation: {
      de: 'Beantworten Sie die Fragen so genau wie moeglich. Je mehr wir ueber Sie wissen, desto besser koennen wir Ihre Empfehlungen personalisieren.',
      it: 'Rispondete alle domande il piu precisamente possibile. Piu sappiamo di voi, meglio possiamo personalizzare le raccomandazioni.',
    },
    nextStep: {
      de: 'Fuellen Sie alle Schritte aus und speichern Sie Ihr Profil.',
      it: 'Completate tutti i passaggi e salvate il vostro profilo.',
    },
    pose: 'achtung',
    quickActions: [],
  },

  '/diary': {
    greeting: {
      de: 'Dokumentieren Sie hier taeglich Ihr Befinden.',
      it: 'Documentate qui il vostro stato quotidiano.',
    },
    explanation: {
      de: 'Das Symptom-Tagebuch hilft Ihnen, Muster zu erkennen und Veraenderungen zu dokumentieren. Tragen Sie regelmaessig Schlaf, Stimmung und Symptome ein.',
      it: 'Il diario dei sintomi vi aiuta a riconoscere modelli e documentare cambiamenti. Inserite regolarmente sonno, umore e sintomi.',
    },
    nextStep: {
      de: 'Fuellen Sie heute einen Eintrag aus, um Ihre Trends aufzubauen.',
      it: 'Compilate oggi una voce per costruire le vostre tendenze.',
    },
    pose: 'hallo',
    quickActions: [],
  },
};

// Personalized context tips based on user data
export interface PersonalizedTip {
  condition: string;
  tip: { de: string; it: string };
}

export const PERSONALIZED_TIPS: PersonalizedTip[] = [
  {
    condition: 'no_profile',
    tip: {
      de: 'Sie haben noch kein Gesundheitsprofil erstellt. Starten Sie jetzt, um personalisierte Empfehlungen zu erhalten.',
      it: 'Non avete ancora creato un profilo sanitario. Iniziate ora per ricevere raccomandazioni personalizzate.',
    },
  },
  {
    condition: 'high_risk',
    tip: {
      de: 'In Ihrer letzten Analyse gibt es Naehrstoffe mit hohem Risiko. Schauen Sie sich Ihren Supplement-Plan an.',
      it: 'Nella vostra ultima analisi ci sono nutrienti ad alto rischio. Guardate il vostro piano integratori.',
    },
  },
  {
    condition: 'supplements_pending',
    tip: {
      de: 'Sie haben heute noch Supplements einzunehmen. Vergessen Sie nicht Ihre taegliche Routine.',
      it: 'Oggi avete ancora integratori da assumere. Non dimenticate la vostra routine quotidiana.',
    },
  },
];

// Helper to get text for current language
export function t(textObj: { de: string; it: string }, lang: Lang): string {
  return textObj[lang] || textObj.de;
}
