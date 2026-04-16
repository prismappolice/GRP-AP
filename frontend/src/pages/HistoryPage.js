import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Book, Award, Zap, Shield } from 'lucide-react';
import { useStaticPageContent } from '@/lib/staticPageContent';

export const HistoryPage = () => { 
  const pageContent = useStaticPageContent('history');
  const sectionMeta = [
    { border: 'border-[#2563EB]', Icon: Clock },
    { border: 'border-[#16A34A]', Icon: Book },
    { border: 'border-[#D97706]', Icon: Shield },
    { border: 'border-[#DC2626]', Icon: Book },
    { border: 'border-[#2563EB]', Icon: Award },
    { border: 'border-[#16A34A]', Icon: Zap },
  ];

  return (
    <div className="min-h-screen">
      <section 
        className="relative z-0 h-[450px] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/ecda69e3-6dae-485f-9f5d-53165e641ecc/images/d69abe7becd65caddc188450114a5291516c8e31d13e645e0f54bdd9e26ef852.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#0F172A]/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">{pageContent.heroEyebrow}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold heading-font tracking-tighter leading-none">
            {pageContent.heroTitle}
          </h1>
          <p className="text-lg text-gray-200 mt-4">{pageContent.heroSubtitle}</p>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">{pageContent.sectionEyebrow}</p>
          <div className="bg-white border border-[#60A5FA] rounded-md p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {pageContent.sections.map((section, index) => {
                const meta = sectionMeta[index] || sectionMeta[0];
                const Icon = meta.Icon;
                return (
                  <div key={section.title + index} className={`border-l-4 ${meta.border} pl-8`}>
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-6 h-6 text-[#D97706]" />
                      <h2 className="text-2xl font-bold heading-font text-[#0F172A]">{section.title}</h2>
                    </div>
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className={`text-base text-[#475569] leading-relaxed ${paragraphIndex < section.paragraphs.length - 1 || section.bullets.length > 0 ? 'mb-4' : ''}`}>
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets.length > 0 ? (
                      <ul className="space-y-2 text-base text-[#475569] list-disc list-inside">
                        {section.bullets.map((bullet, bulletIndex) => {
                          const [label, ...rest] = bullet.split(':');
                          return rest.length > 0 ? (
                            <li key={bulletIndex}><strong>{label}:</strong>{rest.join(':')}</li>
                          ) : (
                            <li key={bulletIndex}>{bullet}</li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
