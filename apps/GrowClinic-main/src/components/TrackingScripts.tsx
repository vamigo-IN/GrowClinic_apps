import Script from "next/script";
import { safeGa4Id, safeGtmId, safeMetaPixelId } from "@/lib/tracking-ids";

interface TrackingScriptsProps {
    ga4Id?: string | null;
    gtmId?: string | null;
    metaPixelId?: string | null;
}

/**
 * Injects analytics / tracking tags site-wide based on the IDs configured in
 * the admin Integrations page. Renders nothing when a given ID is not set.
 */
export function TrackingScripts({ ga4Id, gtmId, metaPixelId }: TrackingScriptsProps) {
    // GA4 defaults to the unified funnel stream (G-FQSGTHMS77) so the site and
    // the audit tool report to the SAME measurement ID — one continuous session
    // across www.growclinic.io → audit.growclinic.io. Previously this defaulted
    // to G-G0S3YVHX7S (the GC-Web stream), which split the funnel and left that
    // stream empty. An admin-set ga4Id still overrides this.
    const ga4 = safeGa4Id(ga4Id) || "G-FQSGTHMS77";
    const gtm = safeGtmId(gtmId);
    const pixel = safeMetaPixelId(metaPixelId);

    return (
        <>
            {/* Google Analytics 4 */}
            {ga4 && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
                        strategy="afterInteractive"
                    />
                    <Script id="ga4-init" strategy="afterInteractive">
                        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4}');`}
                    </Script>
                </>
            )}

            {/* Google Tag Manager */}
            {gtm && (
                <Script id="gtm-init" strategy="afterInteractive">
                    {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');`}
                </Script>
            )}

            {/* Meta (Facebook) Pixel */}
            {pixel && (
                <Script id="meta-pixel" strategy="afterInteractive">
                    {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixel}');
fbq('track', 'PageView');`}
                </Script>
            )}

            {/* Microsoft Clarity */}
            <Script id="ms-clarity" strategy="afterInteractive">
                {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","u3ju4tpj50");`}
            </Script>
        </>
    );
}
