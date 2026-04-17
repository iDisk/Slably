import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  schema?: object;
  ogImage?: string;
}

export default function SEO({ title, description, canonical, schema, ogImage }: SEOProps) {
  useEffect(() => {
    document.title = title;

    let desc = document.querySelector('meta[name="description"]');
    if (!desc) {
      desc = document.createElement('meta');
      (desc as HTMLMetaElement).name = 'description';
      document.head.appendChild(desc);
    }
    (desc as HTMLMetaElement).content = description;

    const setOG = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setOG('og:title', title);
    setOG('og:description', description);
    setOG('og:type', 'website');
    if (ogImage) setOG('og:image', ogImage);
    if (canonical) setOG('og:url', canonical);

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    if (schema) {
      const existing = document.querySelector('#schema-jsonld');
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.id = 'schema-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [title, description, canonical, schema, ogImage]);

  return null;
}
