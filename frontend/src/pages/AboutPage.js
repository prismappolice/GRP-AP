import React from 'react';
import { Card } from '@/components/ui/card';
import { Shield, Users, Target, Award } from 'lucide-react';
import { useStaticPageContent } from '@/lib/staticPageContent';

export const AboutPage = () => {
  const pageContent = useStaticPageContent('about');
  const dutyIcons = [Shield, Users, Target, Award];

  return (
    <div className="min-h-screen pt-16">
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">{pageContent.eyebrow}</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold heading-font tracking-tighter text-[#0F172A] leading-none">
              {pageContent.title}
            </h1>
            <p className="text-xl text-[#475569] mt-4">{pageContent.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <img
                src={pageContent.imageUrl}
                alt="Vijayawada Railway Station"
                className="w-full h-[400px] object-cover rounded-md border border-[#E2E8F0]"
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold heading-font text-[#0F172A] mb-6">{pageContent.whatIsGrpTitle}</h2>
              {pageContent.whatIsGrpParagraphs.map((paragraph, index) => (
                <p key={index} className={`text-base text-[#475569] leading-relaxed ${index < pageContent.whatIsGrpParagraphs.length - 1 ? 'mb-4' : ''}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold heading-font text-[#0F172A] mb-8">{pageContent.dutiesTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pageContent.dutyCards.map((card, index) => {
                const Icon = dutyIcons[index] || Shield;
                return (
                  <Card key={card.title + index} className="p-6 border border-[#E2E8F0] bg-white">
                    <Icon className="w-10 h-10 text-[#2563EB] mb-4" />
                    <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-3">{card.title}</h3>
                    <p className="text-sm text-[#475569] leading-relaxed">{card.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-md p-8">
            <h2 className="text-2xl sm:text-3xl font-bold heading-font text-[#0F172A] mb-6">{pageContent.comparisonTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-[#2563EB] mb-4">{pageContent.grpTitle}</h3>
                <ul className="space-y-2 text-sm text-[#475569]">
                  {pageContent.grpPoints.map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#16A34A] mb-4">{pageContent.rpfTitle}</h3>
                <ul className="space-y-2 text-sm text-[#475569]">
                  {pageContent.rpfPoints.map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
