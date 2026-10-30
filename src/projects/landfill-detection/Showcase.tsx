import { EmbeddedDemo } from '../../ui/EmbeddedDemo';
import { LANDFILL_DEMO_URL } from './meta';

// The live system, shown inside the panel: the real web application of the
// project (map, Drools risk assessment, live notifications), loaded from its
// server.
export default function LandfillShowcase() {
  return (
    <EmbeddedDemo
      url={LANDFILL_DEMO_URL}
      title="Live demo: illegal landfill detection and risk assessment"
      // the map's "locate me" button asks for the visitor's location
      allow="geolocation"
    />
  );
}
