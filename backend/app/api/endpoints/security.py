from fastapi import APIRouter
from app.models.domain import AttackSimulationRequest, AttackSimulationResponse
from app.ai.cybersecurity import simulate_cyber_attack

router = APIRouter()


@router.post("/security/simulate", response_model=AttackSimulationResponse)
def simulate_attack_endpoint(req: AttackSimulationRequest):
    """Simulates cyber attacks (GPS Spoofing, Fake Weather, Sensor Failure, Signal Jamming) & tests defense failsafes."""
    return simulate_cyber_attack(req)
