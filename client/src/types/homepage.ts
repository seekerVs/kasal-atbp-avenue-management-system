
export interface FeatureData {
  icon: string;
  title: string;
  description: string;
}

// Matches the Hero sub-schema
export interface HomeHeroData {
  title: string;
  searchPlaceholder: string;
  imageUrl: string;
}

// Matches the Service sub-schema
export interface ServiceData {
  title: string;
  text: string;
  imageUrl: string;
}

// Matches the QualityCTA sub-schema
export interface QualityCTAData {
  title: string;
  points: string[];
  buttonText: string;
  imageUrl: string;
}

// This is the main type for the entire Home page content object
export interface HomePageContent {
  hero: HomeHeroData;
  features: FeatureData[];
  services: ServiceData[];
  qualityCTA: QualityCTAData;
}