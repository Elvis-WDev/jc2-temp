#!/usr/bin/env python3
"""
Importa el volcado de Strapi (`contenido.md`) a la plataforma.

Se ejecuta contra la API, no contra la base de datos: asi pasa por las mismas reglas
que el panel —RN-001, RN-002, la normalizacion del DOI, los identificadores estables—
en vez de meter filas por debajo y esperar que cuadren.

**Es idempotente.** Cada entidad se busca por su clave natural (nombre, titulo,
codigo) antes de crearla, asi que volver a ejecutarlo actualiza en lugar de duplicar.

Uso:
    python3 scripts/importar-contenido.py            # importa
    python3 scripts/importar-contenido.py --dry-run  # solo dice que haria
"""

import json
import sys
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

SITIO = "http://localhost:3000"
SECO = "--dry-run" in sys.argv

resumen: dict[str, int] = {}


def anotar(que: str) -> None:
    resumen[que] = resumen.get(que, 0) + 1


valores = {}
for linea in open("/home/elvis/jc2-v2/.env"):
    if "=" in linea and not linea.strip().startswith("#"):
        clave, _, valor = linea.partition("=")
        valores[clave.strip()] = valor.strip()

tarro = CookieJar()
nav = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(tarro))


def pedir(metodo, ruta, cuerpo=None, reintentos=6):
    """Una peticion al panel.

    El panel admite 120 peticiones por minuto y una importacion completa pasa de las
    doscientas, asi que al chocar con el limite espera a que se abra la ventana
    siguiente en vez de abandonar a medias. Es el mismo limite que protege al panel en
    produccion: se respeta, no se sube.
    """
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    cabeceras = {"Origin": SITIO}
    if datos:
        cabeceras["Content-Type"] = "application/json"
    peticion = urllib.request.Request(SITIO + ruta, data=datos, headers=cabeceras, method=metodo)
    try:
        with nav.open(peticion) as respuesta:
            contenido = respuesta.read()
            return respuesta.status, (json.loads(contenido) if contenido else None)
    except urllib.error.HTTPError as error:
        contenido = error.read()
        if error.code == 429 and reintentos > 0:
            espera = int(error.headers.get("Retry-After") or 0) + 2
            print(f"  (limite alcanzado, esperando {espera}s)")
            time.sleep(espera)
            return pedir(metodo, ruta, cuerpo, reintentos - 1)
        try:
            return error.code, json.loads(contenido)
        except Exception:
            return error.code, contenido


def exigir(estado, cuerpo, que):
    if estado not in (200, 201, 204):
        print(f"  ERROR {que}: {estado} {json.dumps(cuerpo)[:300]}")
        sys.exit(1)
    return cuerpo["data"] if isinstance(cuerpo, dict) and "data" in cuerpo else cuerpo


# ---------------------------------------------------------------------------
# Los datos, transcritos de contenido.md
# ---------------------------------------------------------------------------

BIO = (
    "I am an Associate Professor in the School of Economics at UNSW Sydney. I began my "
    "career as a theoretical economist working on mechanism design and auction theory; "
    "over time my work has moved increasingly towards political economy and economic "
    "development, including dynamic models of political polarisation. My current research "
    "focuses on how political and economic institutions emerge and change under conditions "
    "of conflict, uncertainty and weak state capacity, with a particular interest in "
    "resource frontiers and illegal mining. Before joining UNSW in 2013, I was a faculty "
    "member at the University of Queensland. I hold a PhD in Economics from Washington "
    "University in St. Louis and a BA in Economics from Pontificia Universidad Catolica del "
    "Peru."
)

TITULAR = {
    "fullName": "Juan Carlos Carbajal",
    "givenName": "Juan Carlos",
    "familyName": "Carbajal",
    "professionalTitle": "Associate Professor",
    "currentPosition": "School of Economics, UNSW Sydney",
    "publicEmail": "jc.carbajal@unsw.edu.au",
    "websiteUrl": "https://juancarloscarbajal.com/",
    "orcid": "0000-0001-7814-1725",
    "scopusUrl": "https://www.scopus.com/authid/detail.uri?authorId=35098384600",
    "shortBio": (
        "Associate Professor in the School of Economics at UNSW Sydney. I work on "
        "mechanism design, political economy and economic development."
    ),
    "fullBioMarkdown": BIO,
    "city": "Sydney",
    "countryCode": "AU",
}

# Nombre completo, nombre de pila, apellido y afiliacion.
#
# El nombre va partido a proposito. La cita y el BibTeX se generan a partir de
# `familyName`/`givenName`, y cuando faltan caen al nombre entero: la referencia sale
# como "Carbajal, J. C., & Jeffrey Ely" en vez de "& Ely, J.". El volcado solo traia el
# nombre completo, asi que la separacion se hace aqui, uno a uno, en lugar de dejarsela
# a una regla que tarde o temprano partiria mal un apellido compuesto.
COAUTORES = [
    ("John Nachbar", "John", "Nachbar", "University of Rochester"),
    ("Steve Callander", "Steve", "Callander", "Stanford University"),
    ("Jeffrey Ely", "Jeffrey", "Ely", "Northwestern University"),
    ("Rudolf Muller", "Rudolf", "Muller", "Maastricht University"),
    ("Andrew McLennan", "Andrew", "McLennan", "University of Queensland"),
    ("Rabee Tourky", "Rabee", "Tourky", "Australian National University"),
    ("G V A Dharanan", "G V A", "Dharanan", None),
    ("Arghya Ghosh", "Arghya", "Ghosh", None),
    ("Ahuva Mu'alem", "Ahuva", "Mu'alem", "Technion - Israel Institute of Technology"),
]

ENLACES_TITULAR = [
    ("linkedin", "LinkedIn", "https://au.linkedin.com/in/juan-carlos-carbajal-97a810368"),
    (
        "otro",
        "UNSW Sydney",
        "https://www.google.com/maps/search/UNSW+Sydney+(The+University+of+New+South+Wales),+UNSW,+NSW+2052+Sydney+Australia/",
    ),
]

# Sus estados, con el codigo interno y la etiqueta que se ve en la web.
ESTADOS = [
    ("published", "Published"),
    ("under_review", "In Review"),
    ("accepted", "Accepted"),
    ("work_in_progress", "Work in Progress"),
    ("rejected", "Rejected"),
]

# Los estados que la semilla dejo en castellano y este contenido no usa, pero que
# apareceran en el desplegable del panel junto a los de arriba.
ESTADOS_RESTANTES = {
    "forthcoming": "Forthcoming",
    "revise_and_resubmit": "Revise and Resubmit",
    "working_paper": "Working Paper",
    "inactive": "Inactive",
}

# Los catalogos vinieron sembrados en castellano. Todo lo que se importa aqui esta en
# ingles y el sitio declara `en` como idioma, asi que dejarlos como estaban pondria
# "Congreso" bajo el titulo de un congreso escrito en ingles. La plataforma no es
# bilingue: una sola etiqueta por termino, en el idioma del sitio.
ETIQUETAS = {
    "affiliation": {
        "permanent": "Permanent", "visiting": "Visiting", "honorary": "Honorary",
        "adjunct": "Adjunct", "emeritus": "Emeritus", "research": "Research",
        "other": "Other",
    },
    "course_level": {
        "graduate": ("Graduate", "Advanced courses for master's and doctoral students, focused on contemporary methods and theoretical frontiers."),
        "undergraduate": ("Undergraduate", "Core courses that build the analytical frameworks of economic theory."),
        "doctoral": ("Doctoral", None),
        "executive": ("Executive Education", None),
        "other": ("Other", None),
    },
    "course_material": {
        "syllabus": "Syllabus", "slides": "Slides", "problem_set": "Problem Set",
        "reading": "Reading", "exam": "Exam", "notes": "Notes", "otro": "Other",
    },
    "event": {
        "seminar": "Seminar", "conference": "Conference", "workshop": "Workshop",
        "lecture": "Lecture", "defence": "Thesis Defence", "call": "Call for Papers",
        "other": "Other",
    },
    "person_link": {"website": "Personal Website", "otro": "Other"},
    "venue": {
        "journal": "Journal", "publisher": "Publisher", "conference": "Conference",
        "working_paper_series": "Working Paper Series", "repository": "Repository",
        "other": "Other",
    },
    "work_file": {
        "paper_pdf": "Paper (PDF)", "appendix": "Appendix", "supplement": "Supplementary Material",
        "code_archive": "Code", "data_archive": "Data", "slides": "Slides",
        "poster": "Poster", "figure": "Figure", "other": "Other",
    },
    "work_link": {
        "publisher": "Publisher", "doi": "DOI", "pdf_external": "External PDF",
        "code": "Code", "dataset": "Data", "replication": "Replication Material",
        "slides": "Slides", "video": "Video", "preprint": "Preprint",
        "project": "Project", "supplementary": "Supplementary Material", "other": "Other",
    },
}

KEYWORDS = [
    "Adjustment Costs", "Approximation Mechanisms", "Auction Theory", "Auctions",
    "Behavioral Economics", "Bounded Rationality", "Budget Constraints", "Causal Models",
    "Dynamic Models", "Dynamic Monopoly", "Economic Reform", "Equilibrium Analysis",
    "Ex-Post Constraints", "Groves Mechanisms", "Implementation Theory",
    "Industrial Organization", "Loss Aversion", "Mechanism Design", "Policy Persistence",
    "Political Polarization", "Price Discrimination", "Quasi-linear Preferences",
    "Revenue Equivalence",
]

# name, publisher, issn, citeScore, tipo
REVISTAS = [
    ("Journal of Mathematical Economics", "Elsevier", None, None, "journal"),
    ("Journal of Political Economy", "University of Chicago Press", None, None, "journal"),
    ("Games & Economic Behavior", "Elsevier", None, None, "journal"),
    ("Journal of Economic Theory", "Elsevier", None, None, "journal"),
    ("Proceedings SAGT 2024 Conference", "Springer", None, None, "conference"),
    ("Theoretical Economics", "Econometric Society", "1555-7561", 2.3, "journal"),
]

# El factor de impacto no tiene campo propio —la ficha de revista guarda `citeScore` y
# un `ranking` de texto para escalas tipo Q1 o A*—, asi que el dato se conserva en las
# notas internas en vez de perderse o disfrazarse de otra cosa.
NOTAS_DE_REVISTA = {
    "Theoretical Economics": "Impact factor 1.3 (dato del sistema anterior).",
}

# El volumen y el ano de cada revista en el volcado, para poder decidir por trabajo.
VOLUMEN_DE_REVISTA = {
    "Journal of Mathematical Economics": ("118", 2025),
    "Journal of Political Economy": ("130", 2022),
    "Games & Economic Behavior": ("124", 2020),
    "Journal of Economic Theory": ("160", 2015),
    "Proceedings SAGT 2024 Conference": ("15156", 2024),
    "Theoretical Economics": ("11", 2016),
}

# La fecha con la que Strapi marco un lote entero al reeditarlo. No es una fecha de
# publicacion: donde aparece, se descarta y manda el ano de la revista.
FECHA_DE_VOLCADO = "2025-10-21"

TRABAJOS = [
    # tipo, titulo, fecha, estado, idioma, version, paginas, doi, download_code,
    # carrusel, portada, revista, autores, keywords, abstract, enlaces
    dict(
        tipo="working_paper",
        titulo="Pay-as-Bid Auctions with Budget Constrained Bidders",
        fecha="2025-09-01", estado="work_in_progress", idioma="en",
        version="New version September 2025", doi=None, codigo="PaBA-2025-09",
        carrusel=False, portada=False, revista=None,
        autores=["Juan Carlos Carbajal", "G V A Dharanan"],
        keywords=["Budget Constraints", "Auctions", "Equilibrium Analysis"],
        resumen=(
            "We investigate the equilibrium equivalence between pay-as-bid auctions and "
            "first-price auctions when bidders may be budget-constrained. This equivalence "
            "requires additional conditions which translate to the global concavity of the "
            "bidder's expected payoff function. We show that, when these conditions are "
            "present, the symmetric equilibrium strategies in the pay-as-bid auction are a "
            "modification of the equilibrium strategies in Che and Gale's (1998) first-price "
            "auction under budget constraints. Our analysis captures a new economic trade-off "
            "for a budget-constrained bidder that only appears in multi-unit auctions and has "
            "no analogue in single-unit auctions. We also show that our conditions collapse in "
            "a sufficiently large market. In at least one instance, the equilibrium equivalence "
            "fails with three or more bidders. Therefore, despite its theoretical appeal, the "
            "equilibrium link between pay-as-bid auctions and first-price auctions is fragile."
        ),
    ),
    dict(
        tipo="working_paper",
        titulo="Demand Landscaping: Dynamic Monopoly with Malleable Preferences",
        fecha="2024-12-31", estado="work_in_progress", idioma="en",
        version="New version coming soon (hopefully)", doi=None, codigo=None,
        carrusel=True, portada=False, revista=None,
        autores=["Juan Carlos Carbajal", "Steve Callander", "Arghya Ghosh"],
        keywords=["Industrial Organization", "Dynamic Monopoly", "Behavioral Economics"],
        resumen=(
            "Traditional IO models take consumer demand as given. We explore a causal feedback "
            "between preferences and behavior: consumer choices influence future preferences. A "
            "firm may engage in demand landscaping - strategically shaping demand over time. In a "
            "dynamic Hotelling model, consumers update ideal points based on past behavior, "
            "granting firms additional market power and generating persistent dominance or steady "
            "growth patterns consistent with real-world market dynamics."
        ),
    ),
    dict(
        tipo="working_paper",
        titulo="Optimal Mechanisms with Ex-Post Budget Constraints",
        fecha="2023-08-01", estado="work_in_progress", idioma="en",
        version="Preliminary version - August 2023", doi=None, codigo="ptimal-Mech-Budgets",
        carrusel=False, portada=False, revista=None,
        autores=["Juan Carlos Carbajal", "Ahuva Mu'alem"],
        keywords=["Mechanism Design", "Budget Constraints"],
        resumen=(
            "We study revenue-maximizing mechanisms where the seller has one or two objects to "
            "sell and the buyer has public valuations and private budgets. We consider ex-post "
            "participation and ex-post budget feasibility constraints to analyze how financial "
            "restrictions affect revenue-maximizing mechanisms."
        ),
    ),
    dict(
        tipo="working_paper",
        titulo="Policy Persistence and Economic Reform",
        fecha="2018-04-01", estado="work_in_progress", idioma="en",
        version="April 2018", doi=None, codigo="Persistence-Reform",
        carrusel=False, portada=False, revista=None,
        autores=["Juan Carlos Carbajal"],
        keywords=["Adjustment Costs", "Economic Reform", "Policy Persistence"],
        resumen=(
            "This paper examines how adjustment costs (e.g., labor market frictions) affect the "
            "implementation of market-oriented reform programs. A policymaker reallocates "
            "resources to increase growth via compensations. With adjustment costs, efficiency "
            "gains require costly compensations, generating persistent transitional policies. The "
            "model shows that policy persistence is optimal: intermediate agents face perverse "
            "incentives, and persistence becomes 'a feature, not a bug' of optimal reform."
        ),
    ),
    dict(
        tipo="working_paper",
        titulo="Inconspicuous Conspicuous Consumption",
        fecha="2016-05-01", estado="work_in_progress", idioma="en",
        version="May 2016", doi=None, codigo="Bling",
        carrusel=False, portada=True, revista=None,
        autores=["Juan Carlos Carbajal"], keywords=[],
        resumen=(
            "We analyze why conspicuous consumption is often subtle despite its signaling role. "
            "In our model, wealthy but poorly connected consumers choose loud status goods, while "
            "well-connected consumers prefer subtle ones to signal exclusivity. The model explains "
            "'old-money' vs. 'nouveau-riche' consumption and why subtly branded goods are often "
            "pricier than loudly branded ones."
        ),
    ),
    dict(
        tipo="working_paper",
        titulo="Evaluating the Performance of Approximation Mechanisms under Budget Constraints",
        fecha="2025-01-01", estado="work_in_progress", idioma="en",
        version="New version coming soon", doi="https://doi.org/10.2139/ssrn.4653093",
        codigo=None, carrusel=False, portada=True, revista=None,
        autores=["Juan Carlos Carbajal", "Ahuva Mu'alem"],
        keywords=["Mechanism Design", "Budget Constraints", "Approximation Mechanisms"],
        resumen=(
            "We study revenue maximization in a buyer-seller setting where the seller has a single "
            "object and the buyer has both a private valuation and a private budget. The presence "
            "of private budgets complicates the classic monopoly problem, making optimal mechanisms "
            "difficult to analyze and highly sensitive to distributional details. We evaluate the "
            "robust performance of approximation mechanisms relative to optimal mechanisms using "
            "two measures: the guaranteed fraction of optimal revenue (GFOR) and the maximal value "
            "of relaxation (MVR). We show sharp contrasts: for bounded distributions, simple "
            "mechanisms can approximate optimal revenue; for unbounded ones, no simple mechanism "
            "can guarantee a positive revenue fraction. These results highlight the fragility of "
            "approximation mechanisms with private budgets."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo=(
            "Monotonicity and Revenue Equivalence Domains by Monotonic Transformations in "
            "Differences"
        ),
        fecha=FECHA_DE_VOLCADO, estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1016/j.jmateco.2016.12.008", codigo="MTP-app",
        carrusel=False, portada=False, revista=None, anio=2017,
        autores=["Juan Carlos Carbajal", "Rudolf Muller"],
        keywords=["Revenue Equivalence", "Quasi-linear Preferences"],
        resumen=(
            "In a mechanism design setting with quasilinear preferences, we study domains of "
            "valuations that guarantee truthful implementability and revenue equivalence. We show "
            "that domains admitting monotonic transformations in differences possess both "
            "properties."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Mechanism Design without Revenue Equivalence",
        fecha="2013-01-01", estado="published", idioma=None, version=None,
        doi="https://doi.org/10.1016/j.jet.2012.12.014", codigo="MechDesign-no-RE",
        carrusel=True, portada=False, revista="Journal of Economic Theory",
        autores=["Juan Carlos Carbajal", "Jeffrey Ely"],
        keywords=["Revenue Equivalence", "Mechanism Design"],
        resumen=(
            "We study mechanism design problems in quasi-linear environments where the envelope "
            "theorem and revenue equivalence fail. We characterize incentive compatibility and "
            "illustrate with loss-averse and public goods settings."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Cause and Effect in Political Polarization: A Dynamic Analysis",
        fecha=FECHA_DE_VOLCADO, estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1086/718200", codigo="Behavioral-Voters",
        carrusel=True, portada=False, revista="Journal of Political Economy",
        autores=["Juan Carlos Carbajal", "Steve Callander"],
        keywords=["Political Polarization", "Dynamic Models"],
        resumen=(
            "Polarization is both a description of the current state of politics and a dynamic "
            "path that has evolved over decades. We model why elites polarized first and more "
            "strongly, while mass polarization came later, by incorporating preference formation "
            "into dynamic elections."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Selling Mechanisms for a Financially Constrained Buyer",
        fecha=FECHA_DE_VOLCADO, estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1016/j.geb.2020.08.014", codigo="Selling-Mechanisms",
        carrusel=False, portada=False, revista="Games & Economic Behavior",
        autores=["Juan Carlos Carbajal", "Ahuva Mu'alem"],
        keywords=["Mechanism Design", "Budget Constraints"],
        resumen=(
            "We study implementability and revenue equivalence for selling mechanisms when a "
            "seller faces a buyer with private valuations and private budgets. We provide "
            "necessary and sufficient conditions for incentive compatibility and budget "
            "feasibility."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Truthful Implementation and Preference Aggregation in Restricted Domains",
        fecha="2013-01-01", estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1016/j.jet.2012.11.001", codigo="Implement-RD",
        carrusel=False, portada=False, revista="Journal of Economic Theory",
        autores=["Juan Carlos Carbajal", "Andrew McLennan", "Rabee Tourky"],
        keywords=["Mechanism Design", "Implementation Theory"],
        resumen=(
            "We study truthful implementation, monotonicity in differences, and lexicographic "
            "affine maximization in quasi-linear environments. We generalize Roberts' theorem for "
            "restricted domains and provide public goods applications."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Implementability under Monotonic Transformations in Differences",
        fecha="2015-01-01", estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1016/j.jet.2015.09.001", codigo="MTD-theory",
        carrusel=False, portada=False, revista="Journal of Economic Theory",
        autores=["Juan Carlos Carbajal", "Rudolf Muller"],
        keywords=["Mechanism Design", "Quasi-linear Preferences"],
        resumen=(
            "In a social choice setting with quasilinear preferences, we introduce monotonic "
            "transformations in differences and show they imply monotonicity and revenue "
            "equivalence for implementable mechanisms."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="Detecting Robust Personal Equilibrium Effects in Misspecified Causal Models",
        fecha=FECHA_DE_VOLCADO, estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1016/j.jmateco.2025.103127", codigo="Robust-PE",
        carrusel=False, portada=True, revista="Journal of Mathematical Economics",
        autores=["Juan Carlos Carbajal", "John Nachbar"],
        keywords=["Causal Models", "Bounded Rationality"],
        resumen=(
            "Following the work of Spiegler (2016), we use directed acyclical graphs (DAGs) to "
            "model a decision maker (DM) who is boundedly rational in the sense of having a "
            "misspecified causal model. Spiegler (2016) shows that certain misspecifications can "
            "lead to personal equilibrium effects: the DM calculates conditional probabilities "
            "incorrectly and her action influences interpretation of the data. We show that these "
            "effects are robust, i.e., they do not depend on distributional details."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo="On the Uniqueness of Groves Mechanisms and the Payoff Equivalence Principle",
        fecha="2010-01-01", estado="published", idioma=None, version=None,
        doi="https://doi.org/10.1016/j.geb.2009.09.009", codigo="Uniqueness-Groves",
        carrusel=False, portada=False, revista="Games & Economic Behavior", anio=2010,
        autores=["Juan Carlos Carbajal"],
        keywords=["Revenue Equivalence", "Groves Mechanisms"],
        resumen=(
            "We revisit the uniqueness of Groves mechanisms under weaker smoothness conditions. "
            "We show that directional derivatives of valuation functions are sufficient to "
            "guarantee payoff equivalence among efficient mechanisms."
        ),
    ),
    dict(
        tipo="journal_article",
        titulo=(
            "A Model of Price Discrimination under Loss Aversion and State Contingent Reference "
            "Points"
        ),
        fecha="2016-01-01", estado="published", idioma="en", version=None,
        paginas="455-485", doi="https://doi.org/10.3982/TE1737", codigo="Discrimination-LA",
        carrusel=False, portada=False, revista="Theoretical Economics",
        autores=["Juan Carlos Carbajal", "Jeffrey Ely"],
        keywords=["Loss Aversion", "Price Discrimination"],
        resumen=(
            "What happens to optimal price discrimination when buyers evaluate quality against "
            "their own expectations, not just their preferences? This paper incorporates loss "
            "aversion into a screening environment with state-contingent reference points, and "
            "shows the resulting distortions can go in surprising directions - sometimes worse "
            "than standard screening, sometimes better than no loss aversion at all."
        ),
        cita=(
            "apa",
            "Carbajal, J. C., & Ely, J. C., (2016). A Model of Price Discrimination under Loss "
            "Aversion and State Contingent Reference Points. Theoretical Economics.",
        ),
    ),
    dict(
        tipo="conference_paper",
        titulo=(
            "Mind the Revenue Gap: On the Performance of Approximation Mechanisms under Budget "
            "Constraints"
        ),
        fecha=FECHA_DE_VOLCADO, estado="published", idioma="en", version=None,
        doi="https://doi.org/10.1007/978-3-031-71033-9_16", codigo="Mind-Rev-Gap",
        carrusel=False, portada=True, revista="Proceedings SAGT 2024 Conference",
        autores=["Juan Carlos Carbajal", "Ahuva Mu'alem"],
        keywords=["Budget Constraints", "Mechanism Design"],
        enlaces=[("publisher", "Springer", "https://link.springer.com/chapter/10.1007/978-3-031-71033-9_16")],
        resumen=(
            "We consider a buyer-seller interaction where the seller has one object to allocate "
            "and the buyer has private valuations and private budgets. We study the revenue "
            "performance of approximation mechanisms and show limitations when incentive "
            "constraints or budget feasibility are relaxed."
        ),
    ),
]

INSTITUCIONES = [
    dict(
        nombre="UNSW Sydney", slug="unsw-sydney",
        web="https://www.unsw.edu.au/", color="#FEDC00", orden=1, pais="AU", ciudad="Sydney",
        departamentos=[dict(nombre="School of Economics", slug="school-of-economics", web=None, orden=2)],
    ),
    dict(
        nombre="The University of Queensland", slug="university-of-queensland",
        web=None, color="#4A2371", orden=2, pais="AU", ciudad="Brisbane",
        departamentos=[
            dict(
                nombre="Business, Economics & Law Faculty",
                slug="business-economics-law-faculty",
                web="https://about.uq.edu.au/faculties-institutes/bel", orden=1,
            )
        ],
    ),
]

CURSOS = [
    dict(
        titulo="Microeconomic Theory 1 (Graduate)", slug="microeconomic-theory-1-graduate",
        nivel="graduate", institucion="UNSW Sydney", departamento="School of Economics",
        descripcion=(
            "Microeconomic theory is the branch of economics that studies how individuals and "
            "firms make decisions in the face of scarcity, and how these decisions interact in "
            "markets. It analyzes concepts like supply and demand, prices, and market equilibrium "
            "to understand how scarce resources are allocated. Key principles include the law of "
            "supply, the law of demand, and the assumption that individuals are rational and aim "
            "to maximize their utility."
        ),
        ediciones=[],
    ),
    dict(
        titulo="Advanced Managerial Economics (Graduate)", slug="",
        nivel="graduate", institucion="The University of Queensland",
        departamento="Business, Economics & Law Faculty", descripcion=None, ediciones=[],
    ),
    dict(
        titulo="Intermediate Microeconomics", slug="intermediate-microeconomics",
        nivel="undergraduate", institucion="UNSW Sydney", departamento="School of Economics",
        descripcion=(
            "I've been teaching Micro 2 (Intermediate Microeconomics) for the last few years.\n\n"
            "Goal: deliver content in mixed formats (text/problem sets, online quizzes, "
            "interactive graphs/figures, video explanations) on a single platform.\n\n"
            "Reading plan (work-in-progress):\n\n"
            "- Chapter 2 | Preferences in a Flat World\n"
            "- Chapter 3 | Applications\n"
            "- Chapter 4 | Bilateral Exchange\n"
            "- Chapter 5 | Sequential Bilateral Exchange\n"
            "- Chapter 6 | Supply of a Single-Output Firm"
        ),
        ediciones=[
            dict(
                nombre="2019", inicio="2018-09-01", fin="2019-02-27", activa=True, orden=1,
                docente="Juan Carlos Carbajal",
                contenido=(
                    "I've been teaching Micro 2 (Intermediate Microeconomics) for the last few "
                    "years. My feeling is that we've been doing this the same way, all over the "
                    "place, for the last 20 or 30 years. And while new Intermediate Microeconomics "
                    "textbooks arrive each year, the outline of each of them is very similar. "
                    "I've been talking to colleagues, here at UNSW and elsewhere to gather their "
                    "views on teaching Micro 2. Those who have taught it acknowledge it's a hard "
                    "course to teach. The common denominator is that, as one of the main purposes "
                    "of the course is to teach students techniques, they - the students - find it "
                    "hard to swallow. Why not try something different? Research universities put "
                    "more emphasis on, well, research, and redeveloping a course is very costly "
                    "and has potentially little payback.\n\n"
                    "With my promotion to Associate Professor now behind me, I want to do things "
                    "differently and have proposed an alternative pathway. I'll try to post the "
                    "material I develop here - all preliminary and in the "
                    "\"read-at-your-own-risk\" category - with the hope of getting as much "
                    "feedback as possible.\n\n"
                    "My ideal Micro 2 course will permit delivering content using a mix of "
                    "formats: text, predominantly (as in a traditional textbook), with some "
                    "problem sets; but also online quizzes, interactive graphs and figures to "
                    "represent concepts, video explanations, etc. Ideally, all this content "
                    "delivered in a single platform.\n\n"
                    "**Preferences in a Flat World**\n\n"
                    "You may have heard that economics is all about solving scarcity problems. "
                    "In other words, we usually hear (or say) that the fundamental question that "
                    "underlies most, if not all, of microeconomics is the following: how does one "
                    "best allocate scarce resources that have multiple, often competing, uses?\n\n"
                    "In all these examples, there is a limited resource (usually income or wealth, "
                    "but not necessarily so) to allocate to multiple options. While this is a good "
                    "catch phrase, it leaves a fundamental aspect unmentioned. To judge what is "
                    "the best possible way to allocate resources, we need to understand what "
                    "motivates the decision maker.\n\n"
                    "Continue reading:\n\n"
                    "- Chapter 2 | Preferences in a Flat World\n"
                    "- Chapter 3 | Applications\n"
                    "- Chapter 4 | Bilateral Exchange\n"
                    "- Chapter 5 | Sequential Bilateral Exchange\n"
                    "- Chapter 6 | Supply of a Single-Output Firm"
                ),
            )
        ],
    ),
]

EVENTOS = [
    dict(
        titulo="2024 Economic Theory Festival", tipo="conference",
        inicio="2024-11-11T05:00:00Z", fin="2024-11-12T05:00:00Z",
        lugar="Teaching Commons - Dalton Building, UNSW Kensington Campus",
        organiza="Juan Carlos Carbajal and Antonio Rosato", principal=False,
        boton="https://sites.google.com/view/economictheoryfestival/2024", color="#FFDC00",
        instituciones=["UNSW Sydney"],
        contenido=(
            "The 2024 version of the Economic Theory Festival features a two-day mini-course by "
            "Daniel Gottlieb, Professor of Managerial Economics and Strategy at the London School "
            "of Economics, covering topics in Insurance Theory from a classical and behavioural "
            "perspective. A collection of talks in the afternoons will complement Daniel's "
            "mini-course."
        ),
    ),
    dict(
        titulo="2023 Economic Theory Festival - Bounded Rationality, Information and Markets",
        tipo="conference", inicio="2023-11-20T05:00:00Z", fin="2023-11-21T05:00:00Z",
        lugar="Room 275, Global Change Institute Building, The University of Queensland",
        organiza="Antonio Rosato and Juan Carlos Carbajal", principal=False,
        boton="https://sites.google.com/view/economictheoryfestival/2023", color="#51247A",
        instituciones=["The University of Queensland"],
        contenido=(
            "The 2023 version of the Economic Theory Festival features a two-day mini-course by "
            "Antonio Penta, Professor of Economics at Universitat Pompeu Fabra and Research "
            "Professor at ICREA. A collection of talks in the afternoons will complement Professor "
            "Penta's course."
        ),
    ),
    dict(
        titulo="2022 Economic Theory Festival - Bounded Rationality, Information and Markets",
        tipo="conference", inicio="2022-12-05T05:00:00Z", fin="2022-12-06T05:00:00Z",
        lugar="BUS Lounge, Level 6 Business School Building, UNSW Sydney",
        organiza="Juan Carlos Carbajal and Antonio Rosato", principal=False,
        boton="https://sites.google.com/view/economictheoryfestival/2022", color="#FFDC00",
        instituciones=["UNSW Sydney"],
        contenido=(
            "The 2022 version of the Economic Theory Festival features a two-day mini-course by "
            "Ran Spiegler, the Aaron Rubinstein Professor of Economics at Tel Aviv University and "
            "a Professor of Economics at University College London. A collection of talks in the "
            "afternoons will complement Professor Spiegler's course."
        ),
    ),
    dict(
        titulo="2025 Economic Theory Festival", tipo="conference",
        inicio="2025-12-10T05:00:00Z", fin="2025-12-11T05:00:00Z",
        lugar="The University of Queensland, Brisbane - Terrace Room, Sir Llew Edwards Building",
        organiza="Antonio Rosato and Juan Carlos Carbajal", principal=False,
        boton="https://sites.google.com/view/economictheoryfestival/home", color="#51247A",
        instituciones=["The University of Queensland"],
        contenido=(
            "The 2025 version of the Economic Theory Festival will feature a two-day mini-course "
            "by Erik Eyster, Professor of Economics at the University of California Santa Barbara. "
            "Erik will deliver lectures on both mornings, followed by a collection of invited "
            "talks in the afternoons. A conference dinner is also planned for the evening of the "
            "first day of the Festival."
        ),
    ),
    dict(
        titulo="2026 Economic Theory Festival", tipo="conference",
        inicio="2026-12-14T22:00:00Z", fin="2026-12-16T08:00:00Z",
        lugar="Research School of Economics, ANU",
        organiza="Evan Calford and Ashley Craig", principal=True,
        boton=None, color="#51247A", instituciones=[],
        contenido=(
            "The 2026 version of the Economic Theory Festival is organised by Evan Calford and "
            "Ashley Craig and hosted by the ANU. It will feature a two-day mini-course by Yoram "
            "Halevy, Professor of Economics and Director of the Toronto Experimental Economics Lab "
            "(TEEL) at the Department of Economics, University of Toronto. Yoram will deliver "
            "lectures on both mornings, followed by a collection of invited talks in the "
            "afternoons. A conference dinner is also planned for the evening of the first day of "
            "the Festival."
        ),
    ),
]

PAGINAS = {
    "home": dict(
        titulo="Juan Carlos Carbajal",
        antetitulo="School of Economics, UNSW Sydney",
        secundario=(
            "### Mechanism Design\n\n"
            "Incentive compatibility, revenue equivalence and auctions with budget "
            "constraints in quasi-linear environments.\n\n"
            "### Political Economy\n\n"
            "Dynamic models of political polarisation, policy persistence and how "
            "institutions change under conflict and weak state capacity.\n\n"
            "### Behavioural Economics\n\n"
            "Bounded rationality, misspecified causal models and loss aversion, and what "
            "they imply for market and policy design."
        ),
        intro=(
            "I teach microeconomic theory at graduate and undergraduate level, and I am "
            "developing an alternative pathway through Intermediate Microeconomics that "
            "mixes text, problem sets, interactive figures and video on a single platform."
        ),
    ),
    "research": dict(
        titulo="Research", antetitulo=None, secundario=None,
        intro=(
            "My research focuses on microeconomic theory, mechanism design, and behavioral "
            "economics. I study how individuals and institutions make decisions under "
            "strategic interactions, financial constraints, and cognitive limitations. My "
            "work examines incentive compatibility, revenue equivalence, auctions with "
            "budget constraints, and bounded rationality, using tools from game theory and "
            "causal modeling to understand how the structure of decision environments shapes "
            "behavior and policy outcomes."
        ),
    ),
    "teaching": dict(
        titulo="Teaching", antetitulo=None, secundario=None,
        intro=(
            "Graduate and undergraduate courses in microeconomic theory at UNSW Sydney and "
            "The University of Queensland."
        ),
    ),
    "events": dict(
        titulo="Economic Theory Festival", antetitulo=None, secundario=None,
        intro=(
            "The Economic Theory Festival is an annual two-day meeting with a mini-course and "
            "a collection of invited talks, hosted in turn by UNSW Sydney, The University of "
            "Queensland and the ANU."
        ),
    ),
}


# ---------------------------------------------------------------------------
# Importacion
# ---------------------------------------------------------------------------


def buscar(lista, campo, valor):
    return next((x for x in lista if x.get(campo) == valor), None)


def main() -> None:
    print(f"Importando el volcado de Strapi{' (SIMULACION)' if SECO else ''}\n")

    estado, _ = pedir(
        "POST",
        "/api/admin/auth/sign-in/email",
        {"email": valores["ADMIN_EMAIL"], "password": valores["ADMIN_PASSWORD"]},
    )
    if estado != 200:
        print(f"No se pudo iniciar sesion: {estado}")
        sys.exit(1)

    def crear_o_actualizar(recurso, existentes, campo, valor, cuerpo, etiqueta):
        """Crea si no existe; si existe, actualiza. Devuelve el registro."""
        ya = buscar(existentes, campo, valor)
        if SECO:
            print(f"  {'actualizaria' if ya else 'crearia'} {etiqueta}: {valor}")
            anotar(f"{etiqueta} {'actualizado' if ya else 'creado'}")
            return ya or {"id": "00000000-0000-0000-0000-000000000000", **cuerpo}
        if ya is not None:
            respuesta = exigir(*pedir("PATCH", f"{recurso}/{ya['id']}", cuerpo), f"{etiqueta} {valor}")
            anotar(f"{etiqueta} actualizado")
            return respuesta
        respuesta = exigir(*pedir("POST", recurso, cuerpo), f"{etiqueta} {valor}")
        anotar(f"{etiqueta} creado")
        return respuesta

    # --- 1. Tipos de trabajo: cuantos salen en la portada ---------------------
    print("1. Catalogos")
    tipos = exigir(*pedir("GET", "/api/admin/work-types"), "tipos")
    tipo_por_codigo = {t["code"]: t for t in tipos}
    for codigo in ("journal_article", "conference_paper", "working_paper"):
        if not SECO:
            pedir("PATCH", f"/api/admin/work-types/{tipo_por_codigo[codigo]['id']}", {"maxItemsHome": 5})
        anotar("tipo de trabajo ajustado")

    # --- 2. Estados academicos, con sus etiquetas en ingles -------------------
    estados = exigir(*pedir("GET", "/api/admin/academic-statuses"), "estados")
    estado_por_codigo = {e["code"]: e for e in estados}
    for codigo, etiqueta in ESTADOS:
        if codigo in estado_por_codigo:
            if not SECO:
                pedir("PATCH", f"/api/admin/academic-statuses/{estado_por_codigo[codigo]['id']}", {"label": etiqueta})
            anotar("estado renombrado")
        else:
            creado = crear_o_actualizar(
                "/api/admin/academic-statuses", estados, "code", codigo,
                {"code": codigo, "label": etiqueta}, "estado",
            )
            estado_por_codigo[codigo] = creado

    for codigo, etiqueta in ESTADOS_RESTANTES.items():
        if codigo in estado_por_codigo and not SECO:
            pedir("PATCH", f"/api/admin/academic-statuses/{estado_por_codigo[codigo]['id']}", {"label": etiqueta})
            anotar("estado renombrado")

    # --- 2b. Los demas catalogos, tambien en el idioma del sitio ---------------
    terminos = exigir(*pedir("GET", "/api/admin/catalog-terms?page_size=200"), "terminos")
    for termino in terminos:
        nuevo = ETIQUETAS.get(termino["catalog"], {}).get(termino["code"])
        if nuevo is None:
            continue
        etiqueta, descripcion = nuevo if isinstance(nuevo, tuple) else (nuevo, None)
        cuerpo = {"label": etiqueta}
        if descripcion is not None:
            cuerpo["description"] = descripcion
        if termino["label"] == etiqueta and (descripcion is None or termino.get("description") == descripcion):
            continue
        if not SECO:
            exigir(*pedir("PATCH", f"/api/admin/catalog-terms/{termino['id']}", cuerpo), f"termino {termino['code']}")
        anotar("termino traducido")

    # --- 3. Estilos de cita ---------------------------------------------------
    estilos = exigir(*pedir("GET", "/api/admin/citation-styles"), "estilos")
    estilo_por_codigo = {e["code"]: e for e in estilos}

    # --- 4. Etiquetas ---------------------------------------------------------
    tags = exigir(*pedir("GET", "/api/admin/tags?page_size=100"), "tags")
    tag_por_nombre = {t["name"]: t for t in tags}
    for nombre in KEYWORDS:
        if nombre not in tag_por_nombre:
            if SECO:
                anotar("etiqueta creada")
                tag_por_nombre[nombre] = {"id": "0", "name": nombre}
                continue
            creado = exigir(*pedir("POST", "/api/admin/tags", {"name": nombre, "slug": ""}), f"tag {nombre}")
            tag_por_nombre[nombre] = creado
            anotar("etiqueta creada")

    # --- 5. Personas ----------------------------------------------------------
    print("2. Personas")
    personas = exigir(*pedir("GET", "/api/admin/persons?page_size=100"), "personas")
    titular = buscar(personas, "isSiteOwner", True)
    if titular is not None and not SECO:
        titular = exigir(*pedir("PATCH", f"/api/admin/persons/{titular['id']}", TITULAR), "titular")
    anotar("titular actualizado")

    persona_por_nombre = {p["fullName"]: p for p in personas}
    persona_por_nombre[TITULAR["fullName"]] = titular or {"id": "0"}

    for nombre, pila, apellido, posicion in COAUTORES:
        cuerpo = {
            "fullName": nombre, "givenName": pila, "familyName": apellido,
            "currentPosition": posicion, "sortName": f"{apellido}, {pila}",
        }
        if SECO:
            persona_por_nombre[nombre] = {"id": "0"}
            anotar("coautor creado" if nombre not in persona_por_nombre else "coautor actualizado")
            continue
        persona_por_nombre[nombre] = crear_o_actualizar(
            "/api/admin/persons", personas, "fullName", nombre, cuerpo, "coautor"
        )

    # --- 6. Enlaces del titular ----------------------------------------------
    if titular is not None and not SECO:
        enlaces = exigir(*pedir("GET", f"/api/admin/person-links?personId={titular['id']}"), "enlaces")
        for tipo, etiqueta, url in ENLACES_TITULAR:
            if any(e["url"] == url for e in enlaces):
                continue
            exigir(
                *pedir("POST", "/api/admin/person-links", {
                    "personId": titular["id"], "linkType": tipo, "label": etiqueta,
                    "url": url, "isPublic": True,
                }),
                f"enlace {etiqueta}",
            )
            anotar("enlace creado")

    # --- 7. Revistas ----------------------------------------------------------
    print("3. Revistas")
    revistas = exigir(*pedir("GET", "/api/admin/venues?page_size=100"), "revistas")
    revista_por_nombre = {v["name"]: v for v in revistas}
    for nombre, editorial, issn, cite_score, tipo in REVISTAS:
        cuerpo = {"name": nombre, "publisherName": editorial, "venueType": tipo}
        if issn:
            cuerpo["issn"] = issn
        if cite_score:
            cuerpo["citeScore"] = cite_score
        if nombre in NOTAS_DE_REVISTA:
            cuerpo["notes"] = NOTAS_DE_REVISTA[nombre]
        creado = crear_o_actualizar("/api/admin/venues", revistas, "name", nombre, cuerpo, "revista")
        revista_por_nombre[nombre] = creado

    # --- 8. Instituciones y departamentos ------------------------------------
    print("4. Instituciones")
    instituciones = exigir(*pedir("GET", "/api/admin/institutions?page_size=100"), "instituciones")
    institucion_por_nombre = {}
    departamento_por_nombre = {}
    for datos in INSTITUCIONES:
        cuerpo = {
            "name": datos["nombre"], "slug": datos["slug"], "brandColor": datos["color"],
            "sortOrder": datos["orden"], "countryCode": datos["pais"], "city": datos["ciudad"],
        }
        if datos["web"]:
            cuerpo["websiteUrl"] = datos["web"]
        institucion = crear_o_actualizar(
            "/api/admin/institutions", instituciones, "name", datos["nombre"], cuerpo, "institucion"
        )
        institucion_por_nombre[datos["nombre"]] = institucion

        if SECO:
            for depto in datos["departamentos"]:
                departamento_por_nombre[depto["nombre"]] = {"id": "0"}
                anotar("departamento creado")
            continue

        deptos = exigir(
            *pedir("GET", f"/api/admin/departments?institutionId={institucion['id']}"), "departamentos"
        )
        for depto in datos["departamentos"]:
            cuerpo = {
                "institutionId": institucion["id"], "name": depto["nombre"],
                "slug": depto["slug"], "sortOrder": depto["orden"],
            }
            if depto["web"]:
                cuerpo["websiteUrl"] = depto["web"]
            creado = crear_o_actualizar(
                "/api/admin/departments", deptos, "name", depto["nombre"], cuerpo, "departamento"
            )
            departamento_por_nombre[depto["nombre"]] = creado

    # --- 9. Publicaciones -----------------------------------------------------
    print("5. Publicaciones")
    existentes = exigir(*pedir("GET", "/api/admin/works?page_size=100"), "trabajos")
    for datos in TRABAJOS:
        revista = revista_por_nombre.get(datos["revista"]) if datos["revista"] else None
        volumen, anio_revista = (
            VOLUMEN_DE_REVISTA[datos["revista"]] if datos["revista"] else (None, None)
        )

        # El ano: el de la revista manda cuando la fecha es la del volcado; el volumen,
        # solo si los dos anos coinciden (una ficha de revista por volumen mezclaba
        # trabajos de anos distintos).
        anio = datos.get("anio") or anio_revista or int(datos["fecha"][:4])
        fecha = None if datos["fecha"] == FECHA_DE_VOLCADO else datos["fecha"]
        if fecha is not None and anio_revista is not None and int(fecha[:4]) != anio_revista:
            anio = int(fecha[:4])
        mismo_volumen = anio_revista is not None and anio == anio_revista

        cuerpo = {
            "workTypeId": tipo_por_codigo[datos["tipo"]]["id"],
            "title": datos["titulo"],
            "academicStatus": datos["estado"],
            "abstractMarkdown": datos["resumen"],
            "publicationYear": anio,
            "publicationDate": fecha,
            "languageCode": datos.get("idioma"),
            "versionLabel": datos.get("version"),
            "pages": datos.get("paginas"),
            "downloadCode": datos.get("codigo"),
            "doi": datos.get("doi"),
            "venueId": revista["id"] if revista else None,
            "volume": volumen if mismo_volumen else None,
            "authors": [
                {"personId": persona_por_nombre[nombre]["id"], "authorOrder": indice + 1}
                for indice, nombre in enumerate(datos["autores"])
            ],
            "tagIds": [tag_por_nombre[k]["id"] for k in datos["keywords"]],
            "links": [
                {"linkType": tipo, "label": etiqueta, "url": url, "isPublic": True}
                for tipo, etiqueta, url in datos.get("enlaces", [])
            ],
        }

        ya = buscar(existentes, "title", datos["titulo"])
        if SECO:
            print(f"  {'actualizaria' if ya else 'crearia'} trabajo: {datos['titulo'][:60]}")
            anotar("trabajo creado" if not ya else "trabajo actualizado")
            continue

        if ya is not None:
            trabajo = exigir(*pedir("PATCH", f"/api/admin/works/{ya['id']}", cuerpo), datos["titulo"])
            anotar("trabajo actualizado")
        else:
            cuerpo["slug"] = ""
            trabajo = exigir(*pedir("POST", "/api/admin/works", cuerpo), datos["titulo"])
            anotar("trabajo creado")

        # Publicar: en el sistema anterior no habia borradores, todo estaba en la web.
        if trabajo["editorialStatus"] != "published":
            exigir(*pedir("POST", f"/api/admin/works/{trabajo['id']}/publish"), f"publicar {datos['titulo']}")
            anotar("trabajo publicado")

        if datos.get("portada"):
            pedir("POST", f"/api/admin/works/{trabajo['id']}/featured", {"isFeatured": True})
            anotar("trabajo destacado")
        if datos.get("carrusel"):
            pedir("POST", f"/api/admin/works/{trabajo['id']}/carousel", {"isCarousel": True})
            anotar("trabajo en el carrusel")

        if datos.get("cita"):
            codigo_estilo, texto = datos["cita"]
            estilo = estilo_por_codigo.get(codigo_estilo)
            if estilo is not None:
                pedir(
                    "PUT",
                    f"/api/admin/works/{trabajo['id']}/citations/{estilo['id']}",
                    {"content": texto},
                )
                anotar("cita guardada")

    # --- 10. Cursos y ediciones ----------------------------------------------
    print("6. Cursos")
    cursos = exigir(*pedir("GET", "/api/admin/courses?page_size=100"), "cursos")
    for datos in CURSOS:
        cuerpo = {
            "title": datos["titulo"], "level": datos["nivel"],
            "descriptionMarkdown": datos["descripcion"],
        }
        ya = buscar(cursos, "title", datos["titulo"])
        if SECO:
            print(f"  {'actualizaria' if ya else 'crearia'} curso: {datos['titulo']}")
            anotar("curso creado" if not ya else "curso actualizado")
            continue

        if ya is not None:
            curso = exigir(*pedir("PATCH", f"/api/admin/courses/{ya['id']}", cuerpo), datos["titulo"])
            anotar("curso actualizado")
        else:
            cuerpo["slug"] = datos["slug"]
            curso = exigir(*pedir("POST", "/api/admin/courses", cuerpo), datos["titulo"])
            anotar("curso creado")

        if curso["editorialStatus"] != "published":
            exigir(*pedir("POST", f"/api/admin/courses/{curso['id']}/publish"), f"publicar {datos['titulo']}")
            anotar("curso publicado")

        # El volcado no traia marca de portada para los cursos: el sistema anterior
        # listaba los tres en su pagina de docencia y no tenia bloque de portada. Como
        # son exactamente tres, se destacan los tres en el orden del volcado; dejarlo
        # sin decidir dejaria el bloque de docencia de la portada vacio.
        if not SECO:
            pedir("POST", f"/api/admin/courses/{curso['id']}/featured", {
                "isFeatured": True, "featuredOrder": CURSOS.index(datos),
            })
            anotar("curso destacado")

        institucion = institucion_por_nombre[datos["institucion"]]
        departamento = departamento_por_nombre[datos["departamento"]]

        # Sin ediciones no habria nada publico: en este modelo un curso se ve a traves
        # de donde se imparte. Los que en Strapi no tenian instancia reciben una sin
        # fechas, que es exactamente lo que su ficha decia: se imparte aqui.
        ediciones = datos["ediciones"] or [
            dict(nombre=None, inicio=None, fin=None, activa=False, orden=0, docente=None, contenido=None)
        ]

        detalle = exigir(*pedir("GET", f"/api/admin/courses/{curso['id']}"), "curso")
        for edicion in ediciones:
            nombre = edicion["nombre"]
            ya_edicion = next(
                (e for e in detalle["offerings"] if (e["name"] or None) == nombre), None
            )
            cuerpo = {
                "courseId": curso["id"],
                "institutionId": institucion["id"],
                "departmentId": departamento["id"],
                "name": nombre,
                "startDate": edicion["inicio"],
                "endDate": edicion["fin"],
                "isActive": edicion["activa"],
                "sortOrder": edicion["orden"],
                "contentMarkdown": edicion["contenido"],
            }
            if edicion["docente"]:
                cuerpo["teachers"] = [
                    {"personId": persona_por_nombre[edicion["docente"]]["id"], "sortOrder": 0}
                ]

            if ya_edicion is not None:
                sin_curso = {k: v for k, v in cuerpo.items() if k != "courseId"}
                creada = exigir(
                    *pedir("PATCH", f"/api/admin/course-offerings/{ya_edicion['id']}", sin_curso),
                    "edicion",
                )
                anotar("edicion actualizada")
            else:
                creada = exigir(*pedir("POST", "/api/admin/course-offerings", cuerpo), "edicion")
                anotar("edicion creada")

            if creada["editorialStatus"] != "published":
                exigir(
                    *pedir("POST", f"/api/admin/course-offerings/{creada['id']}/publish"),
                    "publicar edicion",
                )
                anotar("edicion publicada")

    # --- 11. Eventos ----------------------------------------------------------
    print("7. Eventos")
    eventos = exigir(*pedir("GET", "/api/admin/events?page_size=100"), "eventos")
    for datos in EVENTOS:
        cuerpo = {
            # El volcado no traia resumen, solo el cuerpo. La tarjeta de la portada
            # necesita uno, asi que se toma la primera frase tal cual: cortar por el
            # punto es transparente y no inventa texto que el autor no escribio.
            "summary": datos["contenido"].split(". ")[0] + ".",
            "title": datos["titulo"], "eventType": datos["tipo"],
            "startsAt": datos["inicio"], "endsAt": datos["fin"],
            "location": datos["lugar"], "organizer": datos["organiza"],
            "contentMarkdown": datos["contenido"], "isMain": datos["principal"],
            "buttonColor": datos["color"],
            "institutionIds": [
                institucion_por_nombre[n]["id"] for n in datos["instituciones"]
            ],
        }
        if datos["boton"]:
            cuerpo["buttonUrl"] = datos["boton"]
            cuerpo["buttonLabel"] = "Festival website"

        ya = buscar(eventos, "title", datos["titulo"])
        if SECO:
            print(f"  {'actualizaria' if ya else 'crearia'} evento: {datos['titulo']}")
            anotar("evento creado" if not ya else "evento actualizado")
            continue

        if ya is not None:
            evento = exigir(*pedir("PATCH", f"/api/admin/events/{ya['id']}", cuerpo), datos["titulo"])
            anotar("evento actualizado")
        else:
            cuerpo["slug"] = ""
            evento = exigir(*pedir("POST", "/api/admin/events", cuerpo), datos["titulo"])
            anotar("evento creado")

        if evento["editorialStatus"] != "published":
            exigir(*pedir("POST", f"/api/admin/events/{evento['id']}/publish"), f"publicar {datos['titulo']}")
            anotar("evento publicado")

    # --- 12. Textos de las paginas y ajustes ---------------------------------
    print("8. Paginas y configuracion")
    for clave, datos in PAGINAS.items():
        if SECO:
            anotar("pagina actualizada")
            continue
        exigir(
            *pedir("PATCH", f"/api/admin/page-content/{clave}", {
                "pageTitle": datos["titulo"], "eyebrow": datos["antetitulo"],
                "introMarkdown": datos["intro"], "secondaryMarkdown": datos["secundario"],
                # `events` venia apagada de fabrica; con cinco ediciones del festival
                # dentro, dejarla oculta seria esconder contenido recien importado.
                "isPublished": True,
            }),
            f"pagina {clave}",
        )
        anotar("pagina actualizada")

    if not SECO:
        exigir(
            *pedir("PATCH", "/api/admin/site-settings", {
                "siteName": "Juan Carlos Carbajal",
                "contactEmail": "jc.carbajal@unsw.edu.au",
                "defaultLocale": "en",
                "timezone": "Australia/Sydney",
                "metaTitleDefault": "Juan Carlos Carbajal - Economic Theory",
                "metaDescriptionDefault": (
                    "Associate Professor in the School of Economics at UNSW Sydney. Mechanism "
                    "design, political economy and behavioural economics."
                ),
                "footerText": "(c) 2026 Juan Carlos Carbajal. All rights reserved.",
            }),
            "ajustes",
        )
        anotar("configuracion actualizada")

    print("\nResumen:")
    for que, cuantos in sorted(resumen.items()):
        print(f"  {cuantos:3d}  {que}")


main()
