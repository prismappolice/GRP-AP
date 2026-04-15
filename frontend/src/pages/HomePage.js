import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  FileText,
  Phone, 
  Shield, 
  Heart, 
  HelpCircle,
  TrendingUp,
  MapPin,
  Bell
} from 'lucide-react';

import api, { alertsAPI, latestNewsAPI, normalizeMediaUrl } from '@/lib/api';

import { useStaticPageContent } from '@/lib/staticPageContent';
import NewsCard from '@/components/ui/NewsCard';


export const HomePage = () => {
  const navigate = useNavigate();
  const pageContent = useStaticPageContent('home');
  const [alerts, setAlerts] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const fallbackLatestNews = [];
  const videoRefs = useRef(new Map());

  const normalizeGalleryItem = (item, idx) => {
    const name = item?.name || item?.imageName || item?.heading || `gallery-item-${idx + 1}`;
    const heading = item?.heading || name;
    const content = item?.content || item?.description || '';
    const rawUrl = item?.url || item?.imageUrl || '';
    const url = normalizeMediaUrl(rawUrl);
    const images = Array.isArray(item?.images) && item.images.length > 0
      ? item.images.map((image) => {
          const imageRawUrl = image?.url || '';
          const imageUrl = normalizeMediaUrl(imageRawUrl);
          return {
            ...image,
            url: imageUrl,
          };
        }).filter((image) => Boolean(image.url))
      : (url ? [{ url, name }] : []);
    const type = item?.type || (typeof url === 'string' && /\.(mp4|webm|ogg|mov)$/i.test(url) ? 'video/*' : 'image/*');
    return { ...item, name, heading, content, url, type, images };
  };

  const galleryMedia = gallery.flatMap((item, idx) => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images
        .filter((image) => Boolean(image?.url))
        .map((image, imageIdx) => ({
          id: `${item.id || idx}-image-${imageIdx}`,
          kind: 'image',
          url: image.url,
          alt: image.name || `gallery-${idx}-${imageIdx}`,
        }));
    }
    if (!item?.url) {
      return [];
    }
    const isVideo = String(item?.type || '').startsWith('video');
    return [{
      id: `${item.id || idx}-media`,
      kind: isVideo ? 'video' : 'image',
      url: item.url,
      alt: item.name || `gallery-${idx}`,
    }];
  });

  const effectiveGalleryMedia = galleryMedia;

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await alertsAPI.getAll();
        setAlerts(response.data.slice(0, 3));
      } catch (error) {
        console.error('Failed to load alerts:', error);
      }
    };
    const loadGallery = async () => {
      try {
        const response = await api.get('/gallery-items');
        const items = Array.isArray(response.data) ? response.data : [];
        setGallery(items.map((item, idx) => normalizeGalleryItem(item, idx)));
      } catch (error) {
        console.error('Failed to load gallery items:', error);
        setGallery([]);
      }
    };
    const loadLatestNews = async () => {
      const normalizeNewsItem = (item) => {
        const normalizedImage = normalizeMediaUrl(item?.image);
        const usesUploadedNewsMedia = !normalizedImage || normalizedImage.startsWith('/news_uploads/');
        return {
          ...item,
          image: usesUploadedNewsMedia ? normalizedImage : '',
        };
      };

      try {
        const latestResponse = await latestNewsAPI.get();
        const latestPayload = latestResponse?.data;

        if (Array.isArray(latestPayload)) {
          const normalizedItems = latestPayload.map(normalizeNewsItem).filter((item) => item?.newsTitle || item?.heading);
          setLatestNews(normalizedItems.length > 0 ? normalizedItems : fallbackLatestNews);
          return;
        }

        if (latestPayload && typeof latestPayload === 'object' && (latestPayload.newsTitle || latestPayload.heading)) {
          setLatestNews([normalizeNewsItem(latestPayload)]);
          return;
        }

        const response = await api.get('/news-items');
        const items = Array.isArray(response.data) ? response.data : [];
        const normalizedItems = items.map(normalizeNewsItem).filter((item) => item?.newsTitle || item?.heading);
        setLatestNews(normalizedItems.length > 0 ? normalizedItems : fallbackLatestNews);
      } catch (error) {
        setLatestNews(fallbackLatestNews);
      }
    };
    loadAlerts();
    loadGallery();
    loadLatestNews();
  }, []);

  const handleMediaMouseEnter = (renderId, kind) => {
    if (kind !== 'video') return;
    const videoEl = videoRefs.current.get(renderId);
    if (!videoEl) return;
    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  const handleMediaMouseLeave = (renderId, kind) => {
    if (kind !== 'video') return;
    const videoEl = videoRefs.current.get(renderId);
    if (!videoEl) return;
    videoEl.pause();
    videoEl.currentTime = 0;
  };

  const quickActions = [
    {
      title: 'File Complaint',
      titleTe: 'ఫిర్యాదు నమోదు చేయండి',
      description: 'Report theft, harassment, or other incidents',
      icon: FileText,
      color: 'bg-[#2563EB]',
      link: '/complaint',
      testId: 'quick-action-complaint'
    },
    {
      title: 'Indian Railways',
      titleTe: 'ఇండియన్ రైల్వే',
      description: 'Book tickets, check train status, and more',
      icon: Bell,
      color: 'bg-[#D97706]',
      link: '/indian-railways',
      testId: 'quick-action-indian-railways'
    },
    {
      title: 'Women Safety',
      titleTe: 'మహిళల భద్రత',
      description: 'SOS and safety helpline',
      icon: Heart,
      color: 'bg-[#DC2626]',
      link: '/women-safety',
      testId: 'quick-action-women-safety'
    },
    {
      title: 'Help Desk',
      titleTe: 'సహాయ కేంద్రం',
      description: 'Get assistance from our team',
      icon: HelpCircle,
      color: 'bg-[#D97706]',
      link: '/help-desk',
      testId: 'quick-action-help-desk'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative z-0 flex items-center justify-center overflow-hidden py-10 sm:py-0 sm:h-[480px]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/ecda69e3-6dae-485f-9f5d-53165e641ecc/images/bfa8dd2180230e437fd7c934169f391df9b2df729ed971fb2b451a40a098bbd1.png)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/90 to-[#0F172A]/60" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >
            {/* Logo + Title + DGP Photo row — stacks vertically on mobile */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-11 mb-2 sm:min-h-[220px]">
              <img 
                src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                alt="AP Police Official Logo"
                className="w-20 h-20 sm:w-48 sm:h-48 object-contain flex-shrink-0 [filter:contrast(1.12)_brightness(1.05)_drop-shadow(0_2px_4px_rgba(0,0,0,0.85))_drop-shadow(0_0_2px_rgba(255,255,255,0.35))]"
              />
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <h1 className="text-3xl sm:text-6xl lg:text-7xl font-extrabold heading-font tracking-tighter leading-tight">
                  <span className="block sm:inline">Government</span>
                  <span className="block sm:inline sm:before:content-['_']">Railway Police</span>
                </h1>
                <p className="text-base sm:text-2xl text-gray-200 mt-2">{pageContent.heroSubtitle}</p>
              </div>
              <div className="flex flex-col items-center justify-center flex-shrink-0">
                <div className="w-20 h-20 sm:w-48 sm:h-48 rounded-full border-4 border-white bg-white p-1 shadow-lg overflow-hidden">
                  <img
                    src="/dgp-Sir.jpeg"
                    alt="Director General of Police"
                    className="w-full h-full rounded-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-xl text-gray-200 leading-relaxed mb-6 max-w-7xl mx-auto text-center line-clamp-2 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis sm:line-clamp-none">
              {pageContent.heroTagline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-center">
              <Button
                onClick={() => navigate('/complaint')}
                size="lg"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8 py-6 text-lg w-full sm:w-auto"
                data-testid="hero-file-complaint-button"
              >
                File a Complaint
              </Button>
              <Button
                onClick={() => navigate('/services')}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-[#0F172A] px-8 py-6 text-lg w-full sm:w-auto"
                data-testid="hero-services-button"
              >
                Our Services
              </Button>
              <Button
                onClick={() => navigate('/unidentified-bodies')}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-[#0F172A] px-8 py-6 text-lg w-full sm:w-auto"
                data-testid="hero-unidentified-bodies-button"
              >
                Unidentified Deadbodies
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Message from DPG Section */}
      <section className="py-12 bg-[#F1F5F9]">
        <div className="max-w-7xl min-h-[200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8 rounded-lg shadow-lg bg-white border border-gray-200 py-8">
          <div className="flex-shrink-0 text-center order-first">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#475569] bg-white p-1 shadow-md overflow-hidden mx-auto">
              <img
                src="/dgp-Photo.jpeg"
                alt="Director General of Police"
                className="w-full h-full rounded-full object-cover object-top"
              />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm sm:text-lg font-bold text-[#475569] mb-2">&quot;{pageContent.dgpQuote}&quot;</p>
            <p className="text-xs sm:text-sm text-red-700 font-semibold">-{pageContent.dgpSignature}</p>
          </div>
        </div>
      </section>


      {/* Gallery Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mb-8 text-left">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">GALLERY</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold heading-font tracking-tight text-[#0F172A] mb-4">
              Gallery
            </h2>
          </div>
          {effectiveGalleryMedia.length > 0 ? (
            <div className="overflow-hidden rounded-lg border-2 border-black bg-white p-3">
              <div className="flex w-max gap-4 px-2 animate-marquee">
                {[...effectiveGalleryMedia, ...effectiveGalleryMedia].map((media, idx) => (
                  <div
                    key={`${media.id}-${idx}`}
                    className="h-[300px] sm:h-[300px] min-w-[280px] sm:min-w-[320px] px-3 py-2 overflow-hidden rounded-lg border-2 border-gray-500 bg-white flex items-center justify-center flex-shrink-0"
                    onMouseEnter={() => handleMediaMouseEnter(`${media.id}-${idx}`, media.kind)}
                    onMouseLeave={() => handleMediaMouseLeave(`${media.id}-${idx}`, media.kind)}
                  >
                    {media.kind === 'video' ? (
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current.set(`${media.id}-${idx}`, el);
                          } else {
                            videoRefs.current.delete(`${media.id}-${idx}`);
                          }
                        }}
                        src={media.url}
                        preload="metadata"
                        muted
                        loop
                        playsInline
                        className="h-full w-auto max-w-full object-contain"
                      />
                    ) : (
                      <img src={media.url} alt={media.alt} className="h-full w-auto max-w-full object-contain" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-left">No gallery items yet.</p>
          )}
        </div>
      </section>

      {/* Latest News Section */}
      <section className="py-16 bg-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mb-8 text-left">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">LATEST NEWS</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold heading-font tracking-tight text-[#0F172A]">
              Latest News
            </h2>
          </div>
          {latestNews.length > 0 ? (
            <div className="overflow-hidden rounded-lg border-2 border-black bg-[#F1F5F9] p-3">
              <div className="flex w-max gap-4 px-2 animate-marquee">
                {(latestNews.length > 1 ? [...latestNews, ...latestNews] : latestNews).map((item, idx) => (
                  <div key={`news-${item.id || idx}-${idx}`} className="min-w-[300px] max-w-[320px] flex-shrink-0">
                    <NewsCard
                      heading={item.heading}
                      image={item.image}
                      newsTitle={item.newsTitle}
                      newsSummary={item.newsSummary}
                      date={item.date}
                      source={item.source}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-left text-gray-400">No news available.</div>
          )}
        </div>
      </section>


      {/* Quick Actions */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">QUICK ACCESS</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold heading-font tracking-tight text-[#0F172A]">
              How Can We Help You?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={action.link} data-testid={action.testId}>
                    <Card className="p-5 border border-[#E2E8F0] hover:-translate-y-1 hover:shadow-lg transition-all duration-200 min-h-[230px] bg-white">
                      <div className={`${action.color} w-12 h-12 rounded-md flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-2">{action.title}</h3>
                      <p className="text-xs text-gray-400 mb-3">{action.titleTe}</p>
                      <p className="text-sm text-[#475569] leading-relaxed">{action.description}</p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#D97706]" />
              <p className="text-4xl font-extrabold heading-font mb-2">5000+</p>
              <p className="text-sm text-gray-400">Cases Resolved</p>
            </div>
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-3 text-[#D97706]" />
              <p className="text-4xl font-extrabold heading-font mb-2">50+</p>
              <p className="text-sm text-gray-400">GRP Stations</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-3 text-[#D97706]" />
              <p className="text-4xl font-extrabold heading-font mb-2">24/7</p>
              <p className="text-sm text-gray-400">Protection</p>
            </div>
            <div className="text-center">
              <Phone className="w-8 h-8 mx-auto mb-3 text-[#D97706]" />
              <p className="text-4xl font-extrabold heading-font mb-2">139</p>
              <p className="text-sm text-gray-400">Emergency HelpLine</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-[#2563EB]" />
          <h2 className="text-3xl sm:text-4xl font-bold heading-font text-[#0F172A] mb-4">
            Need Immediate Assistance?
          </h2>
          <p className="text-lg text-[#475569] mb-8 leading-relaxed">
            Our team is available 24/7 to help you. Call emergency number or visit your nearest GRP station.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="tel:112">
              <Button size="lg" className="bg-[#DC2626] hover:bg-[#B91C1C] px-8 py-6 text-lg" data-testid="cta-emergency-button">
                <Phone className="w-5 h-5 mr-2" />
                Call 139 Now
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/stations')}
              className="px-8 py-6 text-lg"
              data-testid="cta-find-station-button"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Find Nearest Station
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

/* Add this CSS to your global styles (e.g., index.css or HomePage.module.css):
.animate-marquee {
  animation: marquee-left 20s linear infinite;
}
@keyframes marquee-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
*/
