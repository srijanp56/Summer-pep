import csv
import io
import json
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.models.domain import OptimizationResponse

router = APIRouter()


@router.post("/export")
def export_mission_report(data: OptimizationResponse, format: str = "json"):
    """
    Exports mission optimization summary as JSON, CSV, or HTML print/PDF document.
    """
    if format == "json":
        json_str = json.dumps(data.model_dump(), indent=2)
        return Response(
            content=json_str,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=droneroute_mission_{data.request_id[:8]}.json"},
        )

    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        # Header section
        writer.writerow(["DroneRoute AI Mission Optimization Report"])
        writer.writerow(["Mission ID", data.request_id])
        writer.writerow(["Winning Algorithm", data.winner_algorithm])
        writer.writerow([])

        # Algorithm comparison table
        writer.writerow(
            [
                "Algorithm",
                "Distance (km)",
                "Flight Time (min)",
                "Battery Drain (%)",
                "Energy (Wh)",
                "Weather Risk",
                "Safety Risk",
                "Success Probability",
                "Total Cost ($)",
                "Exec Time (ms)",
            ]
        )

        for route in [data.ga_route, data.astar_route, data.dijkstra_route]:
            writer.writerow(
                [
                    route.algorithm,
                    route.total_distance_km,
                    route.estimated_flight_time_min,
                    route.battery_consumed_pct,
                    route.energy_wh,
                    route.weather_risk_score,
                    route.safety_risk_score,
                    route.success_probability,
                    route.total_cost_usd,
                    route.execution_time_ms,
                ]
            )

        writer.writerow([])
        writer.writerow(["Winning Route Waypoints (GA)"])
        writer.writerow(["Index", "Latitude", "Longitude", "Altitude (m)", "Terrain"])
        for idx, wp in enumerate(data.ga_route.waypoints):
            writer.writerow([idx + 1, wp.lat, wp.lng, wp.alt, wp.terrain])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=droneroute_mission_{data.request_id[:8]}.csv"},
        )

    elif format == "html" or format == "pdf":
        # Professional HTML report ready for printing/saving as PDF
        html_doc = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>DroneRoute AI Mission Report #{data.request_id[:8]}</title>
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }}
            h1 {{ color: #10b981; border-bottom: 2px solid #334155; padding-bottom: 10px; }}
            .card {{ background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th, td {{ border: 1px solid #334155; padding: 10px; text-align: left; }}
            th {{ background: #0f172a; color: #38bdf8; }}
            .badge {{ background: #10b981; color: #022c22; font-weight: bold; padding: 4px 8px; border-radius: 4px; }}
          </style>
        </head>
        <body>
          <h1>🛸 DroneRoute AI - Autonomous Delivery Report</h1>
          <div class="card">
            <p><strong>Mission ID:</strong> {data.request_id}</p>
            <p><strong>Optimal Route Algorithm:</strong> <span class="badge">{data.winner_algorithm}</span></p>
            <p><strong>Wind Velocity:</strong> {data.weather.wind_speed_m_s} m/s @ {data.weather.wind_direction_deg}°</p>
          </div>

          <div class="card">
            <h2>Algorithm Optimization Comparison</h2>
            <table>
              <tr>
                <th>Algorithm</th><th>Distance (km)</th><th>Time (min)</th><th>Battery Drain (%)</th><th>Cost ($)</th><th>Exec Time (ms)</th>
              </tr>
              <tr>
                <td><strong>GA (Scratch)</strong></td><td>{data.ga_route.total_distance_km}</td><td>{data.ga_route.estimated_flight_time_min}</td><td>{data.ga_route.battery_consumed_pct}%</td><td>${data.ga_route.total_cost_usd}</td><td>{data.ga_route.execution_time_ms} ms</td>
              </tr>
              <tr>
                <td>A* Search</td><td>{data.astar_route.total_distance_km}</td><td>{data.astar_route.estimated_flight_time_min}</td><td>{data.astar_route.battery_consumed_pct}%</td><td>${data.astar_route.total_cost_usd}</td><td>{data.astar_route.execution_time_ms} ms</td>
              </tr>
              <tr>
                <td>Dijkstra</td><td>{data.dijkstra_route.total_distance_km}</td><td>{data.dijkstra_route.estimated_flight_time_min}</td><td>{data.dijkstra_route.battery_consumed_pct}%</td><td>${data.dijkstra_route.total_cost_usd}</td><td>{data.dijkstra_route.execution_time_ms} ms</td>
              </tr>
            </table>
          </div>

          <div class="card">
            <h2>AI Selection Rationale</h2>
            <p style="white-space: pre-line;">{data.ai_explanation}</p>
          </div>
        </body>
        </html>
        """
        return Response(
            content=html_doc,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=droneroute_report_{data.request_id[:8]}.html"},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
