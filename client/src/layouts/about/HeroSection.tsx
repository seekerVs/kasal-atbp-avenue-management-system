
import { Image } from 'react-bootstrap';
import { AboutHeroData } from '../../types';

interface HeroSectionProps {
  data: AboutHeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
  return (
    <section className="about-hero">
      <Image
        src={data.imageUrl}
        alt={data.imageUrl}
        className="about-hero-image"
      />
    </section>
  );
}