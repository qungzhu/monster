import { generatedPetManifest } from './generatedPetManifest';

export type GallerySpecies = 'cat' | 'dog' | 'fox';

export interface GeneratedPet {
  key: string;
  imageUrl: string;
  species: GallerySpecies;
  name: string;
  modelUrl?: string;
}

export const generatedPets: GeneratedPet[] = generatedPetManifest
  .map((pet): GeneratedPet => ({ ...pet }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getGeneratedPet(key: string | null): GeneratedPet | null {
  return generatedPets.find(pet => pet.key === key) ?? null;
}

export const galleryDefaultBreed: Record<GallerySpecies, string> = {
  cat: 'ragdoll',
  dog: 'golden',
  fox: 'redfox',
};
