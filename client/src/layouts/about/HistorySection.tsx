
import { Image } from 'react-bootstrap';
import { HistoryData } from '../../types';

interface HistorySectionProps {
  data: HistoryData;
}

export function HistorySection({ data }: HistorySectionProps) {
  return (
    <section className="history-container">
      <div className="history-image-wrapper">
        <Image src={data.imageUrl} alt={data.altText} fluid />
      </div>
      <div className="history-text-wrapper">
        <p>{data.paragraph}</p>
      </div>
    </section>
  );
}