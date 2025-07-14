export interface AboutHeroData {
  imageUrl: string;
  altText: string;
}

export interface WelcomeData {
  heading: string;
  paragraph: string;
}

export interface HistoryData {
  imageUrl: string;
  altText: string;
  paragraph: string;
}

export interface Feature {
  icon: string;
  heading: string;
  text: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface NewsletterData {
  heading: string;
  paragraph: string;
}

export interface AboutPageData {
  hero: AboutHeroData;
  welcome: WelcomeData;
  history: HistoryData;
  features: Feature[];
  newsletter: NewsletterData;
  faq: FaqItem[];
}