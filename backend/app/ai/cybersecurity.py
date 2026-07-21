import random
import math
from typing import List, Dict, Tuple
from app.models.domain import (
    Waypoint,
    TelemetryEvent,
    AttackSimulationRequest,
    AttackSimulationResponse,
)


def simulate_cyber_attack(req: AttackSimulationRequest) -> AttackSimulationResponse:
    attack_type = req.attack_type.lower()
    severity = req.severity
    wps = req.current_route

    if not wps:
        # Generate default fallback waypoints if empty
        wps = [
            Waypoint(lat=37.7749, lng=-122.4194, alt=50.0),
            Waypoint(lat=37.7800, lng=-122.4100, alt=55.0),
            Waypoint(lat=37.7850, lng=-122.4000, alt=50.0),
        ]

    telemetry_logs: List[TelemetryEvent] = []
    detected = True
    anomaly_score = 0.0
    defense_action = ""
    mitigation_details = ""
    safe_reroute: List[Waypoint] = []

    # Generate baseline clean trajectory points
    n_points = min(10, len(wps) * 2)
    start_wp = wps[0]
    end_wp = wps[-1]

    for t in range(n_points):
        ratio = t / float(n_points - 1)
        base_lat = start_wp.lat + ratio * (end_wp.lat - start_wp.lat)
        base_lng = start_wp.lng + ratio * (end_wp.lng - start_wp.lng)

        inertial_lat = base_lat + random.uniform(-0.00005, 0.00005)
        inertial_lng = base_lng + random.uniform(-0.00005, 0.00005)
        signal_dbm = -65.0 - random.uniform(0, 5)
        battery_pct = max(10.0, 95.0 - (t * 2.5))

        # Inject attack anomalies past mid-flight (t >= 4)
        if t >= 4:
            if attack_type == "gps_spoofing":
                # Simulated fake GPS displacement off path
                offset = 0.008 * severity
                gps_lat = inertial_lat + offset
                gps_lng = inertial_lng + offset * 0.5
                anomaly_val = math.sqrt(offset**2 + (offset * 0.5) ** 2) * 10000.0
                is_anomalous = True

            elif attack_type == "fake_weather":
                # Sudden fake wind/barometer jump
                gps_lat = inertial_lat
                gps_lng = inertial_lng
                anomaly_val = 85.0 * severity  # synthetic wind jump to 85m/s
                is_anomalous = True

            elif attack_type == "sensor_failure":
                # IMU sensor drift / frozen readings
                gps_lat = inertial_lat + 0.001 * random.gauss(0, 1)
                gps_lng = inertial_lng
                anomaly_val = 72.0 * severity
                is_anomalous = True

            elif attack_type == "signal_jamming":
                # Severe signal loss
                gps_lat = inertial_lat
                gps_lng = inertial_lng
                signal_dbm = -110.0 - 15.0 * severity
                anomaly_val = 90.0 * severity
                is_anomalous = True

            else:
                gps_lat = inertial_lat
                gps_lng = inertial_lng
                anomaly_val = 10.0
                is_anomalous = False
        else:
            gps_lat = inertial_lat
            gps_lng = inertial_lng
            anomaly_val = 5.0
            is_anomalous = False

        anomaly_score = max(anomaly_score, anomaly_val)

        telemetry_logs.append(
            TelemetryEvent(
                timestamp_s=t * 5.0,
                gps_lat=round(gps_lat, 6),
                gps_lng=round(gps_lng, 6),
                inertial_lat=round(inertial_lat, 6),
                inertial_lng=round(inertial_lng, 6),
                signal_strength_dbm=round(signal_dbm, 1),
                battery_pct=round(battery_pct, 1),
                anomaly_detected=is_anomalous,
                status="ATTACK_DETECTED" if is_anomalous else "NOMINAL",
            )
        )

    anomaly_score = min(99.9, round(anomaly_score, 1))

    # Formulate defense protocol and safe reroute based on attack classification
    if attack_type == "gps_spoofing":
        defense_action = "SWITCH_TO_INS_OPTICAL_FLOW"
        mitigation_details = (
            f"GPS-INS positional discrepancy reached threshold (Residual > 50m). "
            f"Disabled primary GNSS receiver. Switched to Inertial Navigation (INS) and Optical Flow visual odometry. "
            f"Initiating safe return to nearest emergency waypoint."
        )
        safe_reroute = [
            wps[0],
            Waypoint(
                lat=start_wp.lat + 0.002, lng=start_wp.lng + 0.002, alt=60.0, terrain="urban"
            ),
            wps[0],
        ]

    elif attack_type == "fake_weather":
        defense_action = "REJECT_TELEMETRY_CROSS_CHECK_RADAR"
        mitigation_details = (
            f"Detected unphysical telemetry jump (Wind delta > 40 m/s in 1s). "
            f"Cross-referenced local METAR aviation radar station. Confirmed injected sensor payload. "
            f"Reverted to secondary environmental sensor suite and continued flight path."
        )
        safe_reroute = wps

    elif attack_type == "sensor_failure":
        defense_action = "ACTIVATE_REDUNDANT_IMU_BANK"
        mitigation_details = (
            f"Primary IMU accelerometer variance exceeded safety envelope (Anomaly score {anomaly_score}%). "
            f"Hot-swapped control loop to secondary redundant IMU #2. Stabilized quadcopter attitude."
        )
        safe_reroute = wps

    elif attack_type == "signal_jamming":
        defense_action = "AUTONOMOUS_FAILSAFE_RTH"
        mitigation_details = (
            f"RF C2 link RSSI dropped below -110 dBm (Jamming detected). "
            f"Enforced autonomous Return-To-Home (RTH) protocol without relying on ground control telemetry."
        )
        safe_reroute = list(reversed(wps))

    else:
        defense_action = "LOG_AND_MONITOR"
        mitigation_details = "Telemetry parameters nominal. No threat detected."
        safe_reroute = wps

    return AttackSimulationResponse(
        attack_type=req.attack_type,
        detected=detected,
        anomaly_score=anomaly_score,
        defense_action=defense_action,
        telemetry_logs=telemetry_logs,
        safe_reroute=safe_reroute,
        mitigation_details=mitigation_details,
    )
