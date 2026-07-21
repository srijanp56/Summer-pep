from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_weather_endpoint():
    res = client.get("/api/v1/weather?mode=simulated")
    assert res.status_code == 200
    assert "wind_speed_m_s" in res.json()


def test_rag_query():
    payload = {"query": "What is the maximum altitude limit for drones under FAA Part 107?"}
    res = client.post("/api/v1/rag/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "400" in data["answer"]
    assert len(data["citations"]) > 0


def test_security_simulate():
    payload = {
        "attack_type": "gps_spoofing",
        "severity": 0.8,
        "current_route": [
            {"lat": 37.7749, "lng": -122.4194, "alt": 50.0},
            {"lat": 37.7850, "lng": -122.4000, "alt": 50.0},
        ],
    }
    res = client.post("/api/v1/security/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["detected"] is True
    assert "INS" in data["defense_action"]
