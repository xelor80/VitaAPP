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

  '/profile': {
    greeting: {
      de: 'Hier finden Sie Ihr komplettes Gesundheitsprofil auf einen Blick.',
      it: 'Qui trovate il vostro profilo sanitario completo a colpo d\'occhio.',
    },
    explanation: {
      de: 'Das Gesundheitsprofil zeigt alle Ihre persoenlichen Daten: Koerperwerte, Aktivitaet, Ernaehrung, Schlaf und mehr. Halten Sie es aktuell fuer bessere Empfehlungen.',
      it: 'Il profilo sanitario mostra tutti i vostri dati personali: valori corporei, attivita, alimentazione, sonno e altro. Mantenetelo aggiornato per raccomandazioni migliori.',
    },
    nextStep: {
      de: 'Pruefen Sie, ob Ihre Daten noch aktuell sind — Veraenderungen wie Gewicht oder Aktivitaet beeinflussen Ihre Empfehlungen.',
      it: 'Controllate se i vostri dati sono ancora attuali — cambiamenti come peso o attivita influenzano le raccomandazioni.',
    },
    pose: 'achtung',
    quickActions: [
      {
        id: 'profile_update',
        label: { de: 'Wann sollte ich mein Profil aktualisieren?', it: 'Quando dovrei aggiornare il profilo?' },
        response: {
          de: 'Aktualisieren Sie Ihr Profil bei Aenderungen an Gewicht, Aktivitaetslevel, Schlafgewohnheiten oder Ernaehrung. Auch neue Beschwerden oder Medikamente sollten eingetragen werden.',
          it: 'Aggiornate il profilo in caso di cambiamenti di peso, livello di attivita, abitudini di sonno o alimentazione. Anche nuovi disturbi o farmaci dovrebbero essere inseriti.',
        },
      },
      {
        id: 'profile_impact',
        label: { de: 'Wie beeinflusst mein Profil die App?', it: 'Come influenza il profilo l\'app?' },
        response: {
          de: 'Ihr Profil ist die Basis fuer alles: Supplement-Empfehlungen, Rezeptvorschlaege, Wasserziel und Risikoeinschaetzungen. Je genauer Ihre Daten, desto besser die Ergebnisse.',
          it: 'Il vostro profilo e la base di tutto: raccomandazioni integratori, suggerimenti ricette, obiettivo acqua e valutazioni di rischio. Piu precisi i dati, migliori i risultati.',
        },
      },
    ],
  },

  '/plan': {
    greeting: {
      de: 'Ihr persoenlicher Supplement-Plan — strukturiert fuer optimale Wirkung.',
      it: 'Il vostro piano integratori personale — strutturato per un effetto ottimale.',
    },
    explanation: {
      de: 'Der 8-Wochen-Plan verteilt Ihre Supplements optimal ueber den Tag. Morgens, Mittags und Abends — abgestimmt auf Wechselwirkungen und beste Aufnahme.',
      it: 'Il piano di 8 settimane distribuisce i vostri integratori in modo ottimale durante la giornata. Mattina, mezzogiorno e sera — in base alle interazioni e al miglior assorbimento.',
    },
    nextStep: {
      de: 'Tippen Sie auf ein Supplement, um passende Produkte zu vergleichen und guenstige Preise zu finden.',
      it: 'Toccate un integratore per confrontare i prodotti adatti e trovare prezzi convenienti.',
    },
    pose: 'achtung',
    quickActions: [
      {
        id: 'plan_how',
        label: { de: 'Wie funktioniert der Plan?', it: 'Come funziona il piano?' },
        response: {
          de: 'Der Plan verteilt Ihre Supplements ueber den Tag: Morgens fuer Energie, Mittags fuer Konzentration, Abends fuer Regeneration. Er beruecksichtigt Wechselwirkungen zwischen den Naehrstoffen.',
          it: 'Il piano distribuisce gli integratori durante la giornata: mattina per energia, mezzogiorno per concentrazione, sera per rigenerazione. Considera le interazioni tra i nutrienti.',
        },
      },
      {
        id: 'plan_reminders',
        label: { de: 'Kann ich Erinnerungen aktivieren?', it: 'Posso attivare i promemoria?' },
        response: {
          de: 'Ja! Aktivieren Sie Erinnerungen in den Einstellungen unten im Plan. Sie koennen Zeiten anpassen und sogar einen Schichtplan konfigurieren.',
          it: 'Si! Attivate i promemoria nelle impostazioni in fondo al piano. Potete adattare gli orari e persino configurare un piano turni.',
        },
      },
    ],
  },

  '/recipes': {
    greeting: {
      de: 'Entdecken Sie gesunde Rezepte, die zu Ihrem Profil und Ihren Beduerfnissen passen.',
      it: 'Scoprite ricette sane adatte al vostro profilo e alle vostre esigenze.',
    },
    explanation: {
      de: 'Die Rezepte werden per KI nach Relevanz fuer Ihr Gesundheitsprofil sortiert. Allergien, Ernaehrungsgewohnheiten und Naehrstoffbeduerfnisse werden beruecksichtigt.',
      it: 'Le ricette vengono ordinate dall\'AI per rilevanza rispetto al vostro profilo. Si considerano allergie, abitudini alimentari e fabbisogno nutrizionale.',
    },
    nextStep: {
      de: 'Speichern Sie Lieblingsrezepte und filtern Sie nach Kategorien wie Fruehstueck, Mittag oder Abend.',
      it: 'Salvate le ricette preferite e filtrate per categorie come colazione, pranzo o cena.',
    },
    pose: 'herz',
    quickActions: [
      {
        id: 'recipes_sorting',
        label: { de: 'Wie werden Rezepte sortiert?', it: 'Come vengono ordinate le ricette?' },
        response: {
          de: 'Rezepte mit Zutaten, die Ihre Naehrstoffluecken abdecken, erscheinen zuerst. Ihre Allergien und Unvertraeglichkeiten werden automatisch beruecksichtigt.',
          it: 'Le ricette con ingredienti che coprono le vostre carenze nutrizionali appaiono per prime. Le allergie e intolleranze vengono considerate automaticamente.',
        },
      },
      {
        id: 'recipes_save',
        label: { de: 'Kann ich Rezepte speichern?', it: 'Posso salvare le ricette?' },
        response: {
          de: 'Ja, tippen Sie auf das Herz-Icon bei einem Rezept, um es zu Ihren Favoriten hinzuzufuegen. Finden Sie Ihre gespeicherten Rezepte jederzeit in Ihrer Sammlung.',
          it: 'Si, toccate l\'icona cuore su una ricetta per aggiungerla ai preferiti. Trovate le ricette salvate in qualsiasi momento nella vostra raccolta.',
        },
      },
    ],
  },

  '/medications': {
    greeting: {
      de: 'Hier verwalten Sie Ihre Medikamente — uebersichtlich und sicher.',
      it: 'Qui gestite i vostri farmaci — in modo chiaro e sicuro.',
    },
    explanation: {
      de: 'Tragen Sie Ihre Medikamente ein, legen Sie Einnahmezeiten fest und lassen Sie sich erinnern. Ihre Angaben werden nur gespeichert — keine medizinischen Empfehlungen.',
      it: 'Inserite i vostri farmaci, impostate gli orari di assunzione e ricevete promemoria. I dati vengono solo salvati — nessuna raccomandazione medica.',
    },
    nextStep: {
      de: 'Fuegen Sie Ihr erstes Medikament hinzu, um es im Tagesplan zu sehen.',
      it: 'Aggiungete il vostro primo farmaco per vederlo nel piano giornaliero.',
    },
    pose: 'achtung',
    quickActions: [
      {
        id: 'med_safety',
        label: { de: 'Ist meine Daten sicher?', it: 'I miei dati sono al sicuro?' },
        response: {
          de: 'Ihre Medikamentendaten werden lokal gespeichert und nicht fuer medizinische Empfehlungen verwendet. Die App erinnert nur — sie beratet nicht.',
          it: 'I dati sui farmaci vengono salvati localmente e non utilizzati per raccomandazioni mediche. L\'app ricorda solamente — non consiglia.',
        },
      },
      {
        id: 'med_plan',
        label: { de: 'Wie erscheinen Medikamente im Tagesplan?', it: 'Come appaiono i farmaci nel piano?' },
        response: {
          de: 'Ihre Medikamente werden zusammen mit Supplements im Tagesplan angezeigt, aber farblich getrennt. Blaue Eintraege sind Medikamente, gruene Supplements.',
          it: 'I farmaci vengono mostrati insieme agli integratori nel piano giornaliero, ma con colori diversi. Le voci blu sono farmaci, quelle verdi integratori.',
        },
      },
    ],
  },

  '/daily-plan': {
    greeting: {
      de: 'Ihr kompletter Tagesplan — alles auf einen Blick!',
      it: 'Il vostro piano completo — tutto a colpo d\'occhio!',
    },
    explanation: {
      de: 'Hier sehen Sie alle Supplements und Medikamente fuer heute, sortiert nach Tageszeit. Haken Sie jede Einnahme ab, um Ihren Fortschritt zu tracken.',
      it: 'Qui vedete tutti gli integratori e farmaci per oggi, ordinati per orario. Spuntate ogni assunzione per monitorare i progressi.',
    },
    nextStep: {
      de: 'Haken Sie Ihre naechste Einnahme ab — ein Tipp pro Einnahme genuegt!',
      it: 'Spuntate la vostra prossima assunzione — basta un tocco!',
    },
    pose: 'super',
    quickActions: [
      {
        id: 'daily_colors',
        label: { de: 'Was bedeuten die Farben?', it: 'Cosa significano i colori?' },
        response: {
          de: 'Gruene Eintraege mit Blatt-Icon sind Supplements. Blaue Eintraege mit Pillen-Icon sind Ihre Medikamente. So erkennen Sie auf einen Blick, was was ist.',
          it: 'Le voci verdi con icona foglia sono integratori. Le voci blu con icona pillola sono i vostri farmaci. Cosi riconoscete subito cosa e cosa.',
        },
      },
    ],
  },

  '/water-tracking': {
    greeting: {
      de: 'Behalten Sie Ihre taegliche Wasserzufuhr im Blick — Ihr Koerper wird es Ihnen danken!',
      it: 'Tenete d\'occhio la vostra idratazione quotidiana — il vostro corpo vi ringraziera!',
    },
    explanation: {
      de: 'Ihr Wasserziel wird per KI basierend auf Gewicht, Aktivitaet, Alter und Lebensstil berechnet. Tracken Sie jedes Glas und sehen Sie Ihren Fortschritt in Echtzeit.',
      it: 'Il vostro obiettivo di idratazione viene calcolato dall\'AI in base a peso, attivita, eta e stile di vita. Tracciate ogni bicchiere e vedete i progressi in tempo reale.',
    },
    nextStep: {
      de: 'Trinken Sie gleich ein Glas Wasser und tracken Sie es! Kleine Mengen ueber den Tag verteilt sind besser als alles auf einmal.',
      it: 'Bevete subito un bicchiere d\'acqua e tracciamolo! Piccole quantita distribuite durante il giorno sono meglio di tutto in una volta.',
    },
    pose: 'super',
    quickActions: [
      {
        id: 'water_goal',
        label: { de: 'Wie wird mein Wasserziel berechnet?', it: 'Come viene calcolato il mio obiettivo?' },
        response: {
          de: 'Ihr Wasserziel wird per KI aus Ihrem Gesundheitsprofil berechnet: Koerpergewicht, Groesse, Aktivitaetslevel, Schlaf, Stress und Ernaehrung fliessen ein. Sie koennen das Ziel auch manuell anpassen.',
          it: 'Il vostro obiettivo viene calcolato dall\'AI dal profilo: peso, altezza, attivita, sonno, stress e alimentazione. Potete anche regolare manualmente l\'obiettivo.',
        },
      },
      {
        id: 'water_tips',
        label: { de: 'Tipps fuer mehr Trinken im Alltag?', it: 'Consigli per bere di piu?' },
        response: {
          de: 'Stellen Sie eine Wasserflasche auf den Schreibtisch, trinken Sie vor jeder Mahlzeit ein Glas und starten Sie den Morgen mit warmem Wasser und Zitrone. Erinnerungen helfen ebenfalls!',
          it: 'Mettete una bottiglia d\'acqua sulla scrivania, bevete un bicchiere prima di ogni pasto e iniziate la mattina con acqua tiepida e limone. Anche i promemoria aiutano!',
        },
      },
      {
        id: 'water_history',
        label: { de: 'Wo sehe ich meinen Verlauf?', it: 'Dove vedo il mio storico?' },
        response: {
          de: 'Scrollen Sie auf dieser Seite nach unten — dort finden Sie Ihren 7-Tage und 30-Tage Verlauf als Balkendiagramm. Gruene Tage bedeuten: Ziel erreicht!',
          it: 'Scorrete verso il basso su questa pagina — troverete il vostro storico di 7 e 30 giorni come grafico a barre. I giorni verdi significano: obiettivo raggiunto!',
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

  '/rewards': {
    greeting: {
      de: 'Willkommen im Praemiensystem! Hier siehst du deine gesammelten Punkte und verfuegbaren Praemien.',
      it: 'Benvenuto nel sistema premi! Qui vedi i tuoi punti raccolti e i premi disponibili.',
    },
    explanation: {
      de: 'Das Praemiensystem belohnt dich fuer deine taeglichen Gesundheitsaktivitaeten. Du sammelst Punkte durch Wasser trinken, Supplements einnehmen, Medikamente checken und den taeglichen Check-in. Je laenger deine Streak, desto mehr Bonuspunkte bekommst du!',
      it: 'Il sistema premi ti ricompensa per le tue attivita sanitarie quotidiane. Raccogli punti bevendo acqua, assumendo integratori, controllando i farmaci e facendo il check-in giornaliero. Piu lunga e la tua streak, piu punti bonus ricevi!',
    },
    nextStep: {
      de: 'Sammle weiter Punkte, um deine naechste Praemie freizuschalten. Vergiss nicht den taeglichen Check-in!',
      it: 'Continua a raccogliere punti per sbloccare il tuo prossimo premio. Non dimenticare il check-in giornaliero!',
    },
    pose: 'super',
    quickActions: [
      {
        id: 'how_points',
        label: { de: 'Wie sammle ich Punkte?', it: 'Come raccolgo punti?' },
        response: {
          de: 'Du erhaeltst Punkte fuer verschiedene Aktivitaeten: Wasser trinken (5 Punkte pro Eintrag), Tagesziel erreichen (10 Punkte), Supplements einnehmen (8 Punkte), Medikamente checken (8 Punkte), Tagebuch fuehren (12 Punkte) und den taeglichen Check-in (5 Punkte). Wenn du einen kompletten Tag schaffst, gibt es sogar 25 Bonuspunkte!',
          it: 'Ricevi punti per diverse attivita: bere acqua (5 punti per voce), raggiungere l\'obiettivo giornaliero (10 punti), assumere integratori (8 punti), controllare i farmaci (8 punti), tenere il diario (12 punti) e il check-in giornaliero (5 punti). Se completi un giorno intero, ricevi anche 25 punti bonus!',
        },
      },
      {
        id: 'what_streaks',
        label: { de: 'Was sind Streaks?', it: 'Cosa sono le streak?' },
        response: {
          de: 'Eine Streak zeigt, wie viele Tage in Folge du aktiv warst. Nach 7 Tagen bekommst du 50 Bonuspunkte, nach 14 Tagen sogar 100 Bonuspunkte! Je laenger deine Streak, desto mehr profitierst du.',
          it: 'Una streak mostra quanti giorni consecutivi sei stato attivo. Dopo 7 giorni ricevi 50 punti bonus, dopo 14 giorni addirittura 100 punti bonus! Piu lunga e la tua streak, piu ne benefici.',
        },
      },
      {
        id: 'how_redeem',
        label: { de: 'Wie loesche ich Praemien ein?', it: 'Come riscatto i premi?' },
        response: {
          de: 'Sobald du genug Punkte gesammelt hast, wird die Praemie freigeschaltet. Tippe einfach auf "Einloesen" und du erhaeltst einen persoenlichen Code. Die Punkte werden von deinem Guthaben abgezogen.',
          it: 'Quando hai raccolto abbastanza punti, il premio viene sbloccato. Tocca semplicemente "Riscatta" e riceverai un codice personale. I punti verranno detratti dal tuo saldo.',
        },
      },
    ],
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
import { deUmlauts } from './i18n';

export function t(textObj: { de: string; it: string }, lang: Lang): string {
  const raw = textObj[lang] || textObj.de;
  return lang === 'de' ? deUmlauts(raw) : raw;
}
