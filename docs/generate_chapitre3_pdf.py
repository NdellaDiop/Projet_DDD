#!/usr/bin/env python3
"""Génère le PDF Chapitre 3 — Conception et Réalisation de la solution."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = "/home/ndella/Documents/Projet_DDD/DDD/docs/Chapitre_3_Conception_Realisation.pdf"
FIG_3_2 = "/home/ndella/Documents/Projet_DDD/DDD/docs/captures/fig_3_2_arborescence.png"

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Oblique", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"))

FONT = "DejaVu"
FONT_BOLD = "DejaVu-Bold"
FONT_ITALIC = "DejaVu-Oblique"

PAGE_W, PAGE_H = A4
MARGIN = 2.5 * cm


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title",
            fontName=FONT_BOLD,
            fontSize=20,
            leading=26,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName=FONT,
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#444444"),
            spaceAfter=24,
        ),
        "h1": ParagraphStyle(
            "h1",
            fontName=FONT_BOLD,
            fontSize=16,
            leading=20,
            spaceBefore=18,
            spaceAfter=10,
            textColor=colors.HexColor("#1a365d"),
        ),
        "h2": ParagraphStyle(
            "h2",
            fontName=FONT_BOLD,
            fontSize=13,
            leading=17,
            spaceBefore=14,
            spaceAfter=8,
            textColor=colors.HexColor("#2c5282"),
        ),
        "h3": ParagraphStyle(
            "h3",
            fontName=FONT_BOLD,
            fontSize=11,
            leading=14,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            fontName=FONT,
            fontSize=10.5,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName=FONT,
            fontSize=10.5,
            leading=14,
            leftIndent=14,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName=FONT_ITALIC,
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#555555"),
            spaceBefore=6,
            spaceAfter=14,
        ),
        "placeholder": ParagraphStyle(
            "placeholder",
            fontName=FONT,
            fontSize=10,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#666666"),
        ),
        "table_header": ParagraphStyle(
            "table_header",
            fontName=FONT_BOLD,
            fontSize=9,
            leading=11,
            alignment=TA_CENTER,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            fontName=FONT,
            fontSize=9,
            leading=11,
        ),
    }
    return styles


def P(text, style_name, styles):
    return Paragraph(text, styles[style_name])


def bullet(text, styles):
    return P(f"• {text}", "bullet", styles)


def screenshot_placeholder(caption, figure_num, hint, styles, height=7.5 * cm):
    """Zone réservée pour une capture d'écran."""
    box_w = PAGE_W - 2 * MARGIN
    inner = [
        [Spacer(1, height - 1.2 * cm)],
        [
            P(
                f"<b>[ Insérer la capture d'écran ici ]</b><br/>"
                f"<i>{hint}</i>",
                "placeholder",
                styles,
            )
        ],
    ]
    table = Table(inner, colWidths=[box_w], rowHeights=[height - 1.0 * cm, 1.0 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#94a3b8")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return [
        table,
        P(f"Figure {figure_num} : {caption}", "caption", styles),
    ]


def embedded_figure(image_path, caption, figure_num, styles, max_width=None):
    """Insère une image existante avec légende."""
    max_width = max_width or (PAGE_W - 2 * MARGIN)
    img = RLImage(image_path)
    ratio = max_width / img.drawWidth
    img.drawWidth = max_width
    img.drawHeight = img.drawHeight * ratio
    return [
        img,
        P(f"Figure {figure_num} : {caption}", "caption", styles),
    ]


def tech_table(styles):
    data = [
        [
            P("Composant", "table_header", styles),
            P("Technologie", "table_header", styles),
            P("Justification / usage", "table_header", styles),
        ],
        [
            P("Backend", "table_cell", styles),
            P("PHP 8.1+ / Laravel 10", "table_cell", styles),
            P(
                "Framework mature, ORM Eloquent, écosystème riche "
                "(Sanctum, policies, migrations)",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Base de données", "table_cell", styles),
            P("MariaDB / MySQL", "table_cell", styles),
            P(
                "Moteur relationnel fiable, compatible hébergement mutualisé, "
                "opérations sensibles en transaction",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Environnement front-end", "table_cell", styles),
            P("Node.js 18+ / npm", "table_cell", styles),
            P(
                "Exécution de Vite, installation des dépendances React, scripts de build "
                "et de développement (npm run dev, npm run build)",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Frontend", "table_cell", styles),
            P("React.js (TypeScript, Vite)", "table_cell", styles),
            P(
                "Composants réutilisables, typage statique, compilation et rechargement "
                "à chaud via l'outil Vite (écosystème Node.js)",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Style", "table_cell", styles),
            P("Tailwind CSS + shadcn/ui", "table_cell", styles),
            P(
                "Interface responsive mobile-first, composants accessibles prêts à l'emploi",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Authentification", "table_cell", styles),
            P("Laravel Sanctum", "table_cell", styles),
            P(
                "Authentification API par jeton, adaptée à une architecture SPA / API REST",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Communication API", "table_cell", styles),
            P("Axios + API REST", "table_cell", styles),
            P(
                "Client HTTP centralisé, gestion uniforme des erreurs et intercepteurs",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Paiement", "table_cell", styles),
            P("Wave API + Orange Money API", "table_cell", styles),
            P(
                "Leaders du paiement mobile au Sénégal, confirmation par webhook",
                "table_cell",
                styles,
            ),
        ],
        [
            P("Gestion de version", "table_cell", styles),
            P("Git", "table_cell", styles),
            P("Suivi de l'historique du code, déploiement reproductible", "table_cell", styles),
        ],
        [
            P("Hébergement", "table_cell", styles),
            P("Serveur mutualisé HTTPS", "table_cell", styles),
            P(
                "Accessibilité publique sécurisée (https://pmp.demdikk.sn), sauvegardes quotidiennes",
                "table_cell",
                styles,
            ),
        ],
    ]
    col_widths = [3.2 * cm, 4.2 * cm, 9.1 * cm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build_document():
    styles = build_styles()
    story = []

    # Page de garde
    story.append(Spacer(1, 4 * cm))
    story.append(P("Chapitre 3", "title", styles))
    story.append(
        P("Conception et Réalisation de la solution", "title", styles)
    )
    story.append(Spacer(1, 1 * cm))
    story.append(
        P(
            "Portail des marchés publics — Dakar Dem Dikk (PMP)<br/>"
            "Mémoire de fin d'études / Rapport de stage",
            "subtitle",
            styles,
        )
    )
    story.append(Spacer(1, 2 * cm))
    story.append(
        P(
            "<i>Document généré avec emplacements réservés pour les captures d'écran. "
            "Remplacez chaque zone grisée par la capture correspondante avant la soutenance.</i>",
            "body",
            styles,
        )
    )
    story.append(PageBreak())

    # Introduction
    story.append(P("Chapitre 3 : Conception et Réalisation de la solution", "h1", styles))
    story.append(
        P(
            "Après l'analyse des besoins et la définition des spécifications fonctionnelles "
            "et non fonctionnelles, ce chapitre présente la conception de la solution proposée : "
            "un portail web des marchés publics permettant la publication et la consultation des "
            "avis d'appel d'offres, l'accès structuré aux pièces jointes, la gestion de comptes "
            "à rôles et la mise en place d'un mécanisme de contrôle d'accès au téléchargement "
            "du cahier lorsque celui-ci est payant. L'objectif de cette phase est de traduire "
            "les exigences identifiées en une architecture cohérente, sécurisée et évolutive, "
            "tout en garantissant une expérience utilisateur fluide et conforme aux contraintes "
            "métier. Le dépôt des plis reste, par défaut, physique au siège de l'entreprise ; "
            "le portail assure l'information, la traçabilité et la préparation des dossiers.",
            "body",
            styles,
        )
    )

    # 3.1
    story.append(P("3.1 Architecture et conception de la solution", "h1", styles))
    story.append(
        P(
            "La réussite d'un projet de digitalisation repose sur une architecture claire, "
            "bien définie et adaptée aux besoins. Dans le cadre du PMP de Dakar Dem Dikk, "
            "nous avons adopté une architecture basée sur l'approche client-serveur et le modèle "
            "MVC côté serveur, combiné à une séparation front-end / back-end.",
            "body",
            styles,
        )
    )
    story.append(
        P(
            "La plateforme repose sur une architecture à trois couches principales :",
            "body",
            styles,
        )
    )

    story.append(P("La couche présentation (Front-end)", "h2", styles))
    story.append(
        P(
            "Réalisée avec React.js (TypeScript, Vite, Tailwind CSS, composants shadcn/ui), "
            "elle permet aux utilisateurs d'interagir avec le portail via une interface intuitive, "
            "responsive et adaptée aux profils administrateur, personne responsable du marché (PRM) "
            "et fournisseur. Elle gère l'affichage des appels d'offres, la saisie des formulaires "
            "et la navigation entre les espaces publics et authentifiés. Elle communique avec le "
            "serveur au moyen de requêtes HTTP vers une API REST, en utilisant le client Axios "
            "et un contexte d'authentification centralisé (AuthContext).",
            "body",
            styles,
        )
    )

    story.append(P("La couche logique métier (Back-end)", "h2", styles))
    story.append(
        P(
            "Développée avec PHP 8.1+ et le framework Laravel 10, cette couche contient la logique "
            "métier de l'application. Elle assure l'authentification et le contrôle d'accès par rôle "
            "(Laravel Sanctum, middleware, policies), la gestion des appels d'offres, la gestion des "
            "comptes, le téléchargement sécurisé des documents, le paiement d'accès au cahier, "
            "les notifications, l'audit et le contact. Elle expose une API RESTful consommée par "
            "le front-end et s'appuie en interne sur l'architecture MVC de Laravel.",
            "body",
            styles,
        )
    )

    story.append(P("La couche données (Base de données)", "h2", styles))
    story.append(
        P(
            "Implémentée avec MariaDB (compatible MySQL), elle permet de stocker et gérer les "
            "informations du portail : utilisateurs, rôles, profils fournisseur/PRM, appels "
            "d'offres, documents, achats d'accès au cahier, notifications, etc. L'accès aux "
            "données est assuré par l'ORM Eloquent de Laravel, avec des migrations pour versionner "
            "le schéma relationnel.",
            "body",
            styles,
        )
    )
    story.append(
        P(
            "La figure 3.1 illustre l'organisation de ces trois couches ainsi que les flux d'échange "
            "entre elles, depuis les interfaces utilisateur jusqu'au stockage des données.",
            "body",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Architecture en trois couches du portail des marchés publics",
            "3.1",
            "Schéma : Navigateur → React (dddfront) → API REST Laravel (dddback) → MariaDB/MySQL",
            styles,
            height=8 * cm,
        )
    )

    # 3.2
    story.append(P("3.2 Environnement et outils de réalisation", "h1", styles))
    story.append(
        P(
            "Le développement du portail a mobilisé <b>deux environnements complémentaires</b>. "
            "Côté serveur, un environnement local <b>XAMPP</b> (Apache, MariaDB, PHP) a servi "
            "à l'implémentation et aux essais de l'API Laravel (<b>dddback</b>). Côté client, "
            "l'interface React (<b>dddfront</b>) a été développée avec <b>Node.js</b> : ce runtime "
            "permet d'installer les bibliothèques front-end via <b>npm</b>, de lancer le serveur "
            "de développement <b>Vite</b> (<i>npm run dev</i>) et de produire le build de "
            "production (<i>npm run build</i>) déployé ensuite en fichiers statiques. "
            "Les dépendances back-end sont gérées avec <b>Composer</b>, celles du front-end avec "
            "<b>npm</b> (fichier <i>package.json</i>).",
            "body",
            styles,
        )
    )
    story.append(
        P(
            "Le déploiement en production est assuré sur un hébergement sécurisé accessible en "
            "HTTPS, à l'adresse <b>https://pmp.demdikk.sn</b>. Le code est organisé en deux "
            "dépôts distincts au sein du même projet, comme l'illustre la figure 3.2.",
            "body",
            styles,
        )
    )
    story.append(
        P(
            "Les choix technologiques (tableau 3.1) ont été guidés par les contraintes du projet — "
            "délai de stage limité, maîtrise préalable de la stack, nécessité d'une API découplée "
            "d'un client SPA — ainsi que par les exigences non fonctionnelles définies au chapitre "
            "précédent (sécurité, performance, maintenabilité).",
            "body",
            styles,
        )
    )
    story.append(P("Tableau 3.1 – Choix technologiques et justifications", "h3", styles))
    story.append(tech_table(styles))
    story.append(Spacer(1, 0.5 * cm))
    import os
    if os.path.exists(FIG_3_2):
        story.extend(
            embedded_figure(
                FIG_3_2,
                "Structure des dépôts et arborescence du projet (dddback / dddfront)",
                "3.2",
                styles,
            )
        )
    else:
        story.extend(
            screenshot_placeholder(
                "Structure des dépôts et arborescence du projet",
                "3.2",
                "Arborescence dddback/ (Laravel) et dddfront/ (React, Node.js)",
                styles,
                height=6.5 * cm,
            )
        )

    # 3.3
    story.append(PageBreak())
    story.append(P("3.3 Mise en œuvre", "h1", styles))
    story.append(
        P(
            "La mise en œuvre du portail a consisté à traduire la modélisation présentée au "
            "chapitre 2 en composants fonctionnels concrets, organisés par espace utilisateur. "
            "Cette section décrit les principales réalisations pour chacun des profils — "
            "administrateur, PRM et fournisseur — ainsi que l'espace public et les mécanismes "
            "transverses mis en place (sécurité, paiement, notifications).",
            "body",
            styles,
        )
    )

    # Espace public
    story.append(P("Espace public (visiteur)", "h2", styles))
    story.append(
        P(
            "Accessible sans authentification, l'espace public permet la consultation des appels "
            "d'offres publiés, la recherche par titre ou référence, l'accès au guide "
            "« Comment ça marche » et l'envoi de messages via le formulaire de contact.",
            "body",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Page d'accueil du portail",
            "3.3",
            "Capture : page Index.tsx — hero, fonctionnalités, appels d'offres actifs",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Liste publique des appels d'offres",
            "3.4",
            "Capture : page AppelsOffres.tsx — liste filtrable des AO publiés",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Fiche détaillée d'un appel d'offres",
            "3.5",
            "Capture : page AppelOffreDetails.tsx — informations, documents, modalités de dépôt",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Page « Comment ça marche » et formulaire de contact",
            "3.6",
            "Capture : pages CommentCaMarche.tsx et/ou Contact.tsx",
            styles,
            height=6.5 * cm,
        )
    )

    # Authentification
    story.append(PageBreak())
    story.append(P("Authentification et inscription", "h2", styles))
    story.append(
        P(
            "Les utilisateurs accèdent à leur espace via la page de connexion. Les fournisseurs "
            "s'inscrivent via un guichet unique intégrant la saisie des informations d'entreprise "
            "(raison sociale, NINEA, RCCM) et le dépôt des pièces légales requises.",
            "body",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Page de connexion",
            "3.7",
            "Capture : page Login.tsx",
            styles,
            height=6 * cm,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Formulaire d'inscription fournisseur",
            "3.8",
            "Capture : page Register.tsx — informations entreprise et pièces légales",
            styles,
        )
    )

    # Admin
    story.append(PageBreak())
    story.append(P("Espace administrateur", "h2", styles))
    story.append(
        P("Les principales fonctionnalités de l'espace administrateur sont les suivantes :", "body", styles)
    )
    for item in [
        "Tableau de bord présentant une vue d'ensemble des appels d'offres, des fournisseurs "
        "en attente de validation et des statistiques d'usage de la plateforme.",
        "Gestion des comptes fournisseurs : consultation des pièces soumises, validation ou "
        "rejet motivé, activation ou désactivation des accès.",
        "Gestion des personnes responsables du marché (PRM) : création, modification, "
        "réinitialisation de mot de passe.",
        "Assignation des appels d'offres aux PRM, avec notification automatique de la personne concernée.",
        "Attribution de marché sur les appels d'offres clôturés (attributaire, montant, date).",
        "Consultation des journaux d'activité (logs), des audits et des suggestions transmises par les fournisseurs.",
        "Gestion des messages reçus via le formulaire de contact.",
        "Exports des données (Excel, PDF) pour les appels d'offres, fournisseurs et responsables.",
    ]:
        story.append(bullet(item, styles))

    story.extend(
        screenshot_placeholder(
            "Tableau de bord administrateur — vue d'ensemble",
            "3.9",
            "Capture : AdminDashboard.tsx — onglet vue d'ensemble / KPIs",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Gestion des fournisseurs en attente de validation",
            "3.10",
            "Capture : AdminDashboard.tsx — onglet fournisseurs, validation/rejet",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Assignation d'un appel d'offres à un PRM",
            "3.11",
            "Capture : AdminDashboard.tsx — assignation PRM sur un AO",
            styles,
            height=6.5 * cm,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Historique d'audit et journal des activités",
            "3.12",
            "Capture : AdminDashboard.tsx — onglet audit / AuditHistory.tsx",
            styles,
            height=6.5 * cm,
        )
    )

    # PRM
    story.append(PageBreak())
    story.append(P("Espace personne responsable du marché (PRM)", "h2", styles))
    story.append(
        P("Les principales fonctionnalités de l'espace PRM sont les suivantes :", "body", styles)
    )
    for item in [
        "Création d'un appel d'offres en plusieurs étapes : informations générales, pièces "
        "jointes (avis, cahier des charges), modalités de dépôt physique et option de cahier "
        "payant ou gratuit.",
        "Gestion du cycle de vie de l'AO : enregistrement en brouillon, modification, "
        "publication et clôture.",
        "Suivi des appels d'offres attribués, avec visibilité sur leur statut (brouillon, publié, clôturé).",
        "Consultation de l'annuaire des fournisseurs et de leurs pièces légales.",
        "Statistiques avancées sur les appels d'offres gérés.",
    ]:
        story.append(bullet(item, styles))

    story.extend(
        screenshot_placeholder(
            "Tableau de bord PRM — liste des appels d'offres",
            "3.13",
            "Capture : ResponsableDashboard.tsx — vue principale",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Création d'un appel d'offres (formulaire multi-étapes)",
            "3.14",
            "Capture : ResponsableDashboard.tsx — formulaire de création AO",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Configuration du cahier payant et modalités de dépôt",
            "3.15",
            "Capture : formulaire AO — cahier_paiement_requis, prix XOF, dépôt physique",
            styles,
            height=6.5 * cm,
        )
    )

    # Fournisseur
    story.append(PageBreak())
    story.append(P("Espace fournisseur", "h2", styles))
    story.append(
        P("Les principales fonctionnalités de l'espace fournisseur sont les suivantes :", "body", styles)
    )
    for item in [
        "Inscription en ligne avec saisie des informations de l'entreprise (raison sociale, "
        "NINEA, RCCM) et dépôt des pièces légales pour validation par l'administrateur.",
        "Consultation de la liste des appels d'offres publiés et accès au détail de chaque AO, "
        "incluant les modalités de dépôt physique des plis.",
        "Téléchargement du cahier des charges, immédiat si l'accès est gratuit, ou après "
        "paiement en ligne (Wave, Orange Money) lorsque celui-ci est requis.",
        "Mise à jour des pièces légales après validation du compte, consultation des notifications "
        "et soumission de suggestions à l'administration.",
        "Historique des achats de cahiers des charges et assistant conversationnel (FAQ / IA).",
    ]:
        story.append(bullet(item, styles))

    story.extend(
        screenshot_placeholder(
            "Tableau de bord fournisseur",
            "3.16",
            "Capture : FournisseurDashboard.tsx — vue principale",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Gestion des documents légaux du fournisseur",
            "3.17",
            "Capture : FournisseurDashboard.tsx — onglet pièces légales",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Téléchargement du cahier des charges (accès gratuit ou payant)",
            "3.18",
            "Capture : AppelOffreDetails.tsx ou FournisseurDashboard — accès cahier",
            styles,
            height=6.5 * cm,
        )
    )

    # Paiement
    story.append(PageBreak())
    story.append(P("Flux de paiement du cahier des charges", "h2", styles))
    story.append(
        P(
            "Lorsque le cahier des charges est payant, le fournisseur initie une transaction "
            "depuis le portail. Le serveur crée une session de paiement auprès du prestataire "
            "choisi (Wave ou Orange Money). Après confirmation par webhook ou vérification "
            "synchrone, l'accès au document est débloqué automatiquement. Un mode simulation "
            "permet de tester le flux sans débit réel lors des démonstrations.",
            "body",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Page de paiement du cahier des charges",
            "3.19",
            "Capture : PaiementCahier.tsx — choix Wave / Orange Money",
            styles,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Confirmation de paiement et historique des achats",
            "3.20",
            "Capture : PaiementCahierSimulation.tsx ou onglet « Mes achats » fournisseur",
            styles,
            height=6.5 * cm,
        )
    )

    # Mécanismes transverses
    story.append(P("Mécanismes transverses", "h2", styles))
    story.append(P("Sécurité", "h3", styles))
    for item in [
        "Authentification par jeton via Laravel Sanctum.",
        "Contrôle d'accès par rôle au niveau de chaque route API (middleware et policies).",
        "Mots de passe hachés (bcrypt).",
        "Journalisation des actions sensibles (LogActivite et AuditLog polymorphique).",
        "Rate limiting sur les routes API et le chat fournisseur.",
    ]:
        story.append(bullet(item, styles))

    story.append(P("Paiement en ligne", "h3", styles))
    for item in [
        "Initiation de la transaction côté serveur.",
        "Redirection vers le prestataire choisi (Wave ou Orange Money).",
        "Confirmation par webhook et déblocage automatique de l'accès au document concerné.",
    ]:
        story.append(bullet(item, styles))

    story.append(P("Notifications", "h3", styles))
    story.append(
        bullet(
            "Génération d'événements lors des actions clés (validation d'un dossier, assignation "
            "d'un AO, confirmation de paiement), consultables depuis l'espace de chaque utilisateur.",
            styles,
        )
    )

    story.extend(
        screenshot_placeholder(
            "Centre de notifications utilisateur",
            "3.21",
            "Capture : cloche / panneau notifications dans un des tableaux de bord",
            styles,
            height=6 * cm,
        )
    )
    story.extend(
        screenshot_placeholder(
            "Assistant conversationnel fournisseur (optionnel)",
            "3.22",
            "Capture : FournisseurChatWidget.tsx — widget chat en bas à droite",
            styles,
            height=6 * cm,
        )
    )

    # Conclusion tests
    story.append(Spacer(1, 0.5 * cm))
    story.append(
        P(
            "L'ensemble de ces fonctionnalités a fait l'objet d'une validation manuelle des "
            "parcours nominaux et des principaux cas d'erreur décrits au chapitre 2, avant "
            "la mise en production sur l'hébergement défini en section 3.2.",
            "body",
            styles,
        )
    )

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="Chapitre 3 - Conception et Réalisation",
        author="Portail des marchés publics - Dakar Dem Dikk",
    )
    doc.build(story)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    build_document()
