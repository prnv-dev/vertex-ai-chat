import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  heading: string;
  content: string;
};

export default function SeoPage({
  title,
  description,
  heading,
  content,
}: Props) {
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <main style={{ padding: "48px", maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "20px" }}>
          {heading}
        </h1>

        <p style={{ fontSize: "18px", lineHeight: "1.8" }}>
          {content}
        </p>
      </main>
    </>
  );
}
