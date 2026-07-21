import re
from typing import List, Dict
from app.models.domain import Citation, RAGQueryResponse

KNOWLEDGE_BASE: List[Dict[str, str]] = [
    {
        "id": "faa_107_alt",
        "title": "FAA Part 107 - Maximum Altitude Limits",
        "section": "107.51(b)",
        "source": "FAA Small Unmanned Aircraft Regulations",
        "content": "The altitude of the small unmanned aircraft must be no higher than 400 feet above ground level unless flown within a 400-foot radius of a structure and does not fly higher than 400 feet above the structure's immediate uppermost limit.",
        "keywords": ["altitude", "400", "ceiling", "height", "faa", "limit", "max"],
    },
    {
        "id": "faa_107_bvlos",
        "title": "FAA Part 107 - Beyond Visual Line of Sight (BVLOS)",
        "section": "107.31",
        "source": "FAA Aviation Safety Guidelines",
        "content": "With effective visual line-of-sight waivers or automated detect-and-avoid (DAA) radar systems, drones may operate BVLOS provided redundant command-and-control (C2) links and real-time telemetry are maintained.",
        "keywords": ["bvlos", "line of sight", "visual", "waiver", "radar", "telemetry"],
    },
    {
        "id": "dgca_zone",
        "title": "DGCA Drone Rules - Airspace Zone Classification",
        "section": "Rule 10 - Airspace Map",
        "source": "Ministry of Civil Aviation Drone Rules",
        "content": "Airspace is divided into Green (free flight up to 400ft), Yellow (controlled airspace requiring ATC clearance), and Red (no-fly zones such as airports, military installations, and international borders). Drones must enforce geo-fencing hard stops in Red zones.",
        "keywords": ["dgca", "red zone", "yellow zone", "green zone", "airspace", "no fly", "airport", "military"],
    },
    {
        "id": "battery_safety",
        "title": "Autonomous Battery Operational Protocol",
        "section": "Standard Operating Procedure 4.2",
        "source": "DroneRoute AI Avionics Technical Manual",
        "content": "Drones must maintain a mandatory 20% battery landing reserve at all times. If state of charge (SoC) falls below 25% during flight, the autonomous system triggers immediate Return-to-Home (RTH) or emergency safe-landing procedure at the nearest designated waypoint.",
        "keywords": ["battery", "rth", "reserve", "drain", "discharge", "voltage", "landing", "soc", "charge"],
    },
    {
        "id": "weather_limits",
        "title": "Environmental & Weather Flight Limits",
        "section": "Flight Safety Standard 8.1",
        "source": "Meteorological Aviation Guidelines",
        "content": "Maximum safe operating wind threshold is 12 m/s (approx. 23 knots). In heavy rain exceeding 10 mm/h or visibility under 3 km, flights must be suspended or rerouted around storm fronts to prevent motor electrical damage and sensor degradation.",
        "keywords": ["weather", "wind", "rain", "storm", "visibility", "thunderstorm", "gust", "temperature"],
    },
    {
        "id": "payload_limits",
        "title": "Payload Mass Damping & Center of Gravity Rules",
        "section": "Avionics Operations 3.5",
        "source": "Cargo Drone Airworthiness Manual",
        "content": "Carrying heavy payloads increases total quadcopter inertia and hover power consumption by a factor of (m_total / m_empty)^1.5. Payload weight must not exceed the specified maximum payload weight of the drone model.",
        "keywords": ["payload", "weight", "mass", "cargo", "limit", "capacity", "heavy", "medical"],
    },
]


def query_rag_knowledge_base(query_text: str) -> RAGQueryResponse:
    """Retrieves relevant regulatory and technical documentation for user query."""
    query_lower = query_text.lower()
    tokens = set(re.findall(r"\w+", query_lower))

    scored_items = []
    for item in KNOWLEDGE_BASE:
        score = 0
        for kw in item["keywords"]:
            if kw in query_lower:
                score += 2
        for tok in tokens:
            if tok in item["content"].lower():
                score += 1
        if score > 0:
            scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)

    if not scored_items:
        # Default response
        return RAGQueryResponse(
            query=query_text,
            answer="DroneRoute AI operates strictly under FAA Part 107 and DGCA digital sky regulations. Operations require a 20% minimum battery reserve, strict avoidance of Red No-Fly Zones (Airports/Military), and flight altitude limits under 400ft AGL.",
            citations=[
                Citation(
                    title="FAA Part 107 Operational Summary",
                    section="107.51",
                    source="FAA Federal Aviation Regulations",
                    confidence=0.85,
                )
            ],
            confidence=0.85,
        )

    top_matches = [item for _, item in scored_items[:3]]
    citations = [
        Citation(
            title=item["title"],
            section=item["section"],
            source=item["source"],
            confidence=min(0.99, round(0.70 + 0.10 * idx, 2)),
        )
        for idx, item in enumerate(top_matches)
    ]

    answer_paragraphs = [f"Based on **{top_matches[0]['source']}** ({top_matches[0]['section']}):\n"]
    for item in top_matches:
        answer_paragraphs.append(f"• **{item['title']}**: {item['content']}")

    return RAGQueryResponse(
        query=query_text,
        answer="\n\n".join(answer_paragraphs),
        citations=citations,
        confidence=citations[0].confidence if citations else 0.85,
    )
