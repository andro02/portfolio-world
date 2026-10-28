import type { ComponentType } from 'react';
import type { ProjectDefinition } from './types';

// Downloads showcase code ahead of time and remembers the result, so that when
// a panel opens its showcase can usually be shown right away.

const loaded = new Map<string, ComponentType>();
const loading = new Map<string, Promise<ComponentType>>();

// starts downloading a project's showcase (only once) and resolves with it
export function preloadShowcase(project: ProjectDefinition): Promise<ComponentType> | undefined {
  const { meta, loadShowcase } = project;
  if (!loadShowcase) return undefined;

  let promise = loading.get(meta.slug);
  if (!promise) {
    promise = loadShowcase().then((module) => {
      loaded.set(meta.slug, module.default);
      return module.default;
    });
    // forget a failed download, so a later attempt can try again
    promise.catch(() => loading.delete(meta.slug));
    loading.set(meta.slug, promise);
  }
  return promise;
}

// the showcase if it has already been downloaded
export function getLoadedShowcase(slug: string): ComponentType | undefined {
  return loaded.get(slug);
}
