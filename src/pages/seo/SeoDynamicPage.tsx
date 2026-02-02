import { useParams } from "react-router-dom";
import SeoPage from "./SeoPage";
import { seoPages } from "./seoPages";

export default function SeoDynamicPage() {
  const { slug } = useParams();

  const page = seoPages.find(p => p.slug === slug);

  if (!page) return null;

  return (
    <SeoPage
      title={page.title}
      description={page.description}
      heading={page.heading}
      content={page.content}
    />
  );
}
