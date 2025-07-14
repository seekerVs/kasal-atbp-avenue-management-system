import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { NewsletterData } from '../../types'; 

interface NewsletterSectionProps {
  data: NewsletterData;
}

export function NewsletterSection({ data }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setFormMessage({ type: 'danger', text: 'Please enter a valid email address.' });
      return;
    }
    console.log(`Subscribing ${email} to the newsletter...`);
    setFormMessage({ type: 'success', text: 'Thank you for subscribing!' });
    setEmail("");
    setTimeout(() => setFormMessage(null), 5000);
  };
  
  return (
    <>
      <section className="newsletter-section pt-0">
        <div>
          <h2>{data.heading}</h2>
          <p className="mb-0">{data.paragraph}</p>
        </div>
        <Form onSubmit={handleNewsletterSubmit} className="newsletter-form">
          <Form.Control
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit">Subscribe</Button>
        </Form>
      </section>
      {formMessage && (
        <Alert variant={formMessage.type} className="mx-auto" style={{ maxWidth: '500px' }}>
          {formMessage.text}
        </Alert>
      )}
    </>
  );
}