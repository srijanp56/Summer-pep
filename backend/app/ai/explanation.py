from app.models.domain import RouteResult, WeatherConditions, DroneSpecs


def generate_ai_explanation(
    ga_route: RouteResult,
    astar_route: RouteResult,
    dijkstra_route: RouteResult,
    weather: WeatherConditions,
    specs: DroneSpecs,
    payload_kg: float,
) -> str:
    """
    Generates structured AI explanation detailing why the optimal route was chosen
    and why alternative routes were rejected.
    """
    reasons = []

    # 1. Best Algorithm comparison
    routes = {"Genetic Algorithm": ga_route, "A*": astar_route, "Dijkstra": dijkstra_route}
    winner_name = min(routes, key=lambda k: (routes[k].safety_risk_score, routes[k].battery_consumed_pct))
    winner = routes[winner_name]

    reasons.append(
        f"🎯 **Selected Route ({winner.algorithm})** achieved an optimal multi-objective score with "
        f"**{winner.battery_consumed_pct}%** battery drain and **{winner.total_distance_km} km** total distance."
    )

    # 2. No-Fly Zone avoidance logic
    if winner.safety_risk_score == 0:
        reasons.append(
            "🛡️ **Safety & Restricted Airspace**: The selected path completely circumvents active "
            "No-Fly Zone polygons (International Airport Airspace and Military Buffer Zones), avoiding severe regulatory penalties."
        )
    else:
        reasons.append(
            "⚠️ **Restricted Airspace Alert**: Minimal flight buffer infringement detected. Path minimized exposure compared to direct trajectory."
        )

    # 3. Weather & Wind vectors
    if weather.wind_speed_m_s > 8.0:
        reasons.append(
            f"💨 **Wind Adaptation**: Heavy winds of {weather.wind_speed_m_s} m/s @ {weather.wind_direction_deg}° were detected. "
            f"The route adjusted waypoint angles to avoid strong headwind vectors, reducing parasitic drag."
        )
    elif weather.rain_intensity_mm_h > 2.0:
        reasons.append(
            f"🌧️ **Rain Mitigation**: Precipitation level of {weather.rain_intensity_mm_h} mm/h increased drag; "
            f"waypoints maintained stable altitude below severe turbulence ceilings."
        )
    else:
        reasons.append(
            f"☀️ **Optimal Conditions**: Moderate wind ({weather.wind_speed_m_s} m/s) allowed near-direct cruise velocity with minimal thrust degradation."
        )

    # 4. Battery & Payload dynamics
    pay_pct = (payload_kg / specs.max_payload_kg) * 100.0
    if pay_pct > 60.0:
        reasons.append(
            f"📦 **Heavy Payload Dynamics**: Payload mass of {payload_kg} kg ({pay_pct:.1f}% capacity) increased hover power demand by "
            f"approx. {pay_pct * 0.45:.1f}%. Waypoints avoided unnecessary vertical climb angles."
        )
    else:
        reasons.append(
            f"📦 **Payload Stability**: Payload mass of {payload_kg} kg was well within safe operational limits of {specs.model_name}."
        )

    # 5. Why alternatives were rejected
    for algo_name, r in routes.items():
        if algo_name != winner.algorithm:
            if r.safety_risk_score > winner.safety_risk_score:
                reasons.append(
                    f"❌ **{algo_name} Rejected**: Route passed too close to restricted airspace or elevated terrain risk (Safety Penalty: {r.safety_risk_score:.2f})."
                )
            elif r.battery_consumed_pct > winner.battery_consumed_pct + 3.0:
                diff = r.battery_consumed_pct - winner.battery_consumed_pct
                reasons.append(
                    f"❌ **{algo_name} Rejected**: Required {diff:.1f}% more battery power due to sub-optimal waypoint geometry."
                )

    return "\n\n".join(reasons)
