import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);

  return null;
}

export default function SafetyMap() {
  const [position, setPosition] = useState(null);
  const [destination, setDestination] = useState("");
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "Select Get My Location to begin."
  );

  function getMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support location services.");
      return;
    }

    setMessage("Requesting location permission...");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setRoute([]);
        setDistance(null);
        setMessage("Location detected successfully.");
      },
      (error) => {
        const errors = {
          1: "Location permission denied. Allow location in browser settings.",
          2: "Location unavailable. Check GPS or device location settings.",
          3: "Location request timed out. Please try again."
        };

        setMessage(errors[error.code] || "Could not access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  async function findRoute() {
    if (!position) {
      setMessage("Please get your current location first.");
      return;
    }

    const values = destination.split(",").map((v) => v.trim());
    const lat = Number(values[0]);
    const lon = Number(values[1]);

    if (
      values.length !== 2 ||
      values[0] === "" ||
      values[1] === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      setMessage("Enter destination as latitude,longitude.");
      return;
    }

    setLoading(true);
    setMessage("Calculating route...");

    try {
      // OSRM expects longitude,latitude order.
      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${position[1]},${position[0]};${lon},${lat}` +
        "?overview=full&geometries=geojson";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Routing service unavailable.");
      }

      const result = await response.json();

      if (result.code !== "Ok" || !result.routes?.length) {
        throw new Error("No route found.");
      }

      const selectedRoute = result.routes[0];
      const points = selectedRoute.geometry.coordinates.map(
        ([longitude, latitude]) => [latitude, longitude]
      );

      setRoute(points);
      setDistance(selectedRoute.distance / 1000);
      setMessage("Route calculated successfully.");
    } catch (error) {
      setRoute([]);
      setDistance(null);
      setMessage(
        error.message || "Could not calculate the route. Try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  const center = position || [26.4499, 80.3319];

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h2>SurakshaPath - Safety Map</h2>
      <p>View your location and plan a route to your destination.</p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <button type="button" onClick={getMyLocation}>
          📍 Get My Location
        </button>

        <input
          type="text"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Destination latitude,longitude"
          aria-label="Destination coordinates"
          style={{
            flex: "1 1 240px",
            minWidth: 0,
            padding: 10
          }}
        />

        <button
          type="button"
          onClick={findRoute}
          disabled={loading}
        >
          {loading ? "Finding Route..." : "Find Route"}
        </button>
      </div>

      <p role="status" aria-live="polite">{message}</p>

      {distance !== null && (
        <p>
          <strong>Route distance:</strong> {distance.toFixed(2)} km
        </p>
      )}

      <MapContainer
        center={center}
        zoom={13}
        style={{
          height: 450,
          width: "100%",
          borderRadius: 12
        }}
      >
        <MapUpdater center={center} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {position && (
          <Marker position={position}>
            <Popup>Your current location</Popup>
          </Marker>
        )}

        {route.length > 0 && (
          <>
            <Marker position={route[route.length - 1]}>
              <Popup>Your destination</Popup>
            </Marker>

            <Polyline positions={route} />
          </>
        )}
      </MapContainer>

      <p style={{ fontSize: 12, color: "#666" }}>
        Map data © OpenStreetMap contributors. Route calculation uses the
        public OSRM demo service and may be subject to usage limits.
      </p>

      <p style={{ fontSize: 13 }}>
        <strong>Emergency notice:</strong> This map does not automatically
        call emergency services or send your location to trusted contacts.
        Test all emergency features separately before relying on them.
      </p>
    </main>
  );
}
