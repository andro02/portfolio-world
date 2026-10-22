import { projects } from '../projects/registry';
import { Station } from './Station';

export function Stations() {
  return (
    <>
      {projects.map(({ meta }) => (
        <Station key={meta.slug} meta={meta} />
      ))}
    </>
  );
}
