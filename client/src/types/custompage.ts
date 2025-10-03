// client/src/types/custompage.ts

export interface GalleryImage {
  imageUrl: string;
  altText: string;
}

export interface CustomTailoringPageContent {
  heading: string;
  subheading: string;
  buttonText: string;
  galleryImages: GalleryImage[];
}