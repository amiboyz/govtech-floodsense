import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Location } from "../types";

const riskColor = { low: "#32d5a4", moderate: "#ffbf5b", high: "#ff6b6b", insufficient_data: "#9aa7a2" };

export function MapPanel({ locations, selected, onSelect }: { locations: Location[]; selected?: Location; onSelect: (location: Location) => void }) {
  return (
    <MapContainer center={[-6.2, 106.83]} zoom={11} minZoom={9} maxZoom={17} zoomControl={false} className="map">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {locations.map((location) => (
        <CircleMarker
          key={location.id}
          center={[location.latitude, location.longitude]}
          radius={selected?.id === location.id ? 9 : location.risk_level === "high" ? 6 : 4}
          pathOptions={{
            color: selected?.id === location.id ? "#ffffff" : riskColor[location.risk_level],
            fillColor: riskColor[location.risk_level], fillOpacity: 0.85, weight: selected?.id === location.id ? 3 : 1,
          }}
          eventHandlers={{ click: () => onSelect(location) }}
        >
          <Popup>
            <strong>{location.name}</strong><br />
            {location.category.replaceAll("_", " ")} · skor {location.score ?? "—"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
