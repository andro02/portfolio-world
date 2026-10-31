import { EmbeddedDemo } from '../../ui/EmbeddedDemo';
import { FLEET_DEMO_URL } from './meta';

// The live system, shown inside the panel: the real Angular application with
// its Spring Boot backend and the simulator sending factory, warehouse and
// vehicle data, loaded from its server.
export default function FleetShowcase() {
  return (
    <EmbeddedDemo
      url={FLEET_DEMO_URL}
      title="Live demo: factory, warehouse and fleet monitoring platform"
    />
  );
}
