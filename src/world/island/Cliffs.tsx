import { CLIFF_PILLARS } from './cliffLayout';
import { Pillar } from './Pillar';

export function Cliffs() {
  return (
    <>
      {CLIFF_PILLARS.map((pillar, index) => (
        <Pillar key={index} {...pillar} />
      ))}
    </>
  );
}
