import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    url?: string;
}

export default function SEO({ title, description, keywords, image, url }: SEOProps) {
    const siteTitle = "BRICKERS - AI LEGO Creator";
    const fullTitle = title === "BRICKERS" ? title : `${title} | BRICKERS`;
    const defaultImage = "/vite.png"; // Use a default image if none provided
    const siteUrl = "https://brickers.vercel.app"; // Replace with actual domain if known, or make dynamic
    const currentUrl = url ? url : siteUrl;

    return (
        <Helmet>
            {/* Basic SEO */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}

            {/* Open Graph (Facebook, LinkedIn, etc.) */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image || defaultImage} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteTitle} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image || defaultImage} />

            {/* Canonical */}
            <link rel="canonical" href={currentUrl} />
        </Helmet>
    );
}
