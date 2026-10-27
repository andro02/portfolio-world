import { projects } from '../projects/registry';
import { Station } from './Station';

export function Stations() {
  return (
    <>
      {projects.map((project) => (
        <Station key={project.meta.slug} project={project} />
      ))}
    </>
  );
}
