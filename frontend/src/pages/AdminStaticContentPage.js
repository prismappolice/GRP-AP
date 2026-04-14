import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { pageContentAPI } from '@/lib/api';
import { DEFAULT_STATIC_PAGE_CONTENT, STATIC_PAGE_OPTIONS } from '@/data/staticPageContent';
import { arrayToBlocks, arrayToLines, blocksToArray, linesToArray, mergeStaticPageContent } from '@/lib/staticPageContent';

const labelClass = 'text-sm font-semibold text-[#0F172A]';
const fieldClass = 'space-y-2';

const HistorySectionEditor = ({ section, index, onChange }) => (
  <Card className="border border-[#E2E8F0] bg-white p-5 space-y-4">
    <div className={fieldClass}>
      <label className={labelClass}>Section {index + 1} Title</label>
      <Input value={section.title} onChange={(event) => onChange(index, 'title', event.target.value)} />
    </div>
    <div className={fieldClass}>
      <label className={labelClass}>Paragraphs</label>
      <Textarea
        rows={6}
        value={arrayToBlocks(section.paragraphs)}
        onChange={(event) => onChange(index, 'paragraphs', blocksToArray(event.target.value))}
      />
      <p className="text-xs text-[#64748B]">Separate paragraphs with a blank line.</p>
    </div>
    <div className={fieldClass}>
      <label className={labelClass}>Bullets</label>
      <Textarea
        rows={5}
        value={arrayToLines(section.bullets)}
        onChange={(event) => onChange(index, 'bullets', linesToArray(event.target.value))}
      />
      <p className="text-xs text-[#64748B]">Use one bullet point per line.</p>
    </div>
  </Card>
);

const AdminStaticContentPage = () => {
  const { pageKey = 'home' } = useParams();
  const activePage = useMemo(
    () => STATIC_PAGE_OPTIONS.find((page) => page.key === pageKey) || STATIC_PAGE_OPTIONS[0],
    [pageKey],
  );
  const [formData, setFormData] = useState(() => mergeStaticPageContent(activePage.key));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    pageContentAPI.getPage(activePage.key)
      .then((response) => {
        if (!disposed) {
          setFormData(mergeStaticPageContent(activePage.key, response.data?.content));
        }
      })
      .catch(() => {
        if (!disposed) {
          setFormData(mergeStaticPageContent(activePage.key, DEFAULT_STATIC_PAGE_CONTENT[activePage.key]));
        }
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [activePage.key]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateDutyCard = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      dutyCards: current.dutyCards.map((card, cardIndex) => (cardIndex === index ? { ...card, [field]: value } : card)),
    }));
  };

  const updateHistorySection = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (sectionIndex === index ? { ...section, [field]: value } : section)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await pageContentAPI.updatePage(activePage.key, formData);
      toast.success(`${activePage.label} page content updated`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save page content');
    } finally {
      setSaving(false);
    }
  };

  const renderPageFields = () => {
    switch (activePage.key) {
      case 'home':
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div className={fieldClass}>
              <label className={labelClass}>Hero Title</label>
              <Input value={formData.heroTitle} onChange={(event) => updateField('heroTitle', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Hero Subtitle</label>
              <Input value={formData.heroSubtitle} onChange={(event) => updateField('heroSubtitle', event.target.value)} />
            </div>
            <div className={`${fieldClass} md:col-span-2`}>
              <label className={labelClass}>Hero Tagline</label>
              <Textarea rows={4} value={formData.heroTagline} onChange={(event) => updateField('heroTagline', event.target.value)} />
            </div>
            <div className={`${fieldClass} md:col-span-2`}>
              <label className={labelClass}>DGP Quote</label>
              <Textarea rows={4} value={formData.dgpQuote} onChange={(event) => updateField('dgpQuote', event.target.value)} />
            </div>
            <div className={`${fieldClass} md:col-span-2`}>
              <label className={labelClass}>DGP Signature</label>
              <Input value={formData.dgpSignature} onChange={(event) => updateField('dgpSignature', event.target.value)} />
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass}>Eyebrow</label>
                <Input value={formData.eyebrow} onChange={(event) => updateField('eyebrow', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Subtitle</label>
                <Input value={formData.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Page Title</label>
                <Input value={formData.title} onChange={(event) => updateField('title', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Header Image URL</label>
                <Input value={formData.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} />
              </div>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>What is GRP? Title</label>
              <Input value={formData.whatIsGrpTitle} onChange={(event) => updateField('whatIsGrpTitle', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>What is GRP? Paragraphs</label>
              <Textarea
                rows={8}
                value={arrayToBlocks(formData.whatIsGrpParagraphs)}
                onChange={(event) => updateField('whatIsGrpParagraphs', blocksToArray(event.target.value))}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Duties Section Title</label>
              <Input value={formData.dutiesTitle} onChange={(event) => updateField('dutiesTitle', event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {formData.dutyCards.map((card, index) => (
                <Card key={card.title + index} className="border border-[#E2E8F0] bg-white p-5 space-y-3">
                  <div className={fieldClass}>
                    <label className={labelClass}>Card {index + 1} Title</label>
                    <Input value={card.title} onChange={(event) => updateDutyCard(index, 'title', event.target.value)} />
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Card {index + 1} Description</label>
                    <Textarea rows={4} value={card.description} onChange={(event) => updateDutyCard(index, 'description', event.target.value)} />
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass}>Comparison Section Title</label>
                <Input value={formData.comparisonTitle} onChange={(event) => updateField('comparisonTitle', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>GRP Column Title</label>
                <Input value={formData.grpTitle} onChange={(event) => updateField('grpTitle', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>GRP Points</label>
                <Textarea rows={6} value={arrayToLines(formData.grpPoints)} onChange={(event) => updateField('grpPoints', linesToArray(event.target.value))} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>RPF Column Title</label>
                <Input value={formData.rpfTitle} onChange={(event) => updateField('rpfTitle', event.target.value)} />
                <Textarea rows={6} className="mt-2" value={arrayToLines(formData.rpfPoints)} onChange={(event) => updateField('rpfPoints', linesToArray(event.target.value))} />
              </div>
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass}>Hero Eyebrow</label>
                <Input value={formData.heroEyebrow} onChange={(event) => updateField('heroEyebrow', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Section Eyebrow</label>
                <Input value={formData.sectionEyebrow} onChange={(event) => updateField('sectionEyebrow', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Hero Title</label>
                <Input value={formData.heroTitle} onChange={(event) => updateField('heroTitle', event.target.value)} />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Hero Subtitle</label>
                <Input value={formData.heroSubtitle} onChange={(event) => updateField('heroSubtitle', event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {formData.sections.map((section, index) => (
                <HistorySectionEditor key={section.title + index} section={section} index={index} onChange={updateHistorySection} />
              ))}
            </div>
          </div>
        );
      case 'organization':
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div className={fieldClass}>
              <label className={labelClass}>Page Title</label>
              <Input value={formData.title} onChange={(event) => updateField('title', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Subtitle</label>
              <Input value={formData.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Chart Title</label>
              <Input value={formData.chartTitle} onChange={(event) => updateField('chartTitle', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Chart Image URL</label>
              <Input value={formData.chartImageUrl} onChange={(event) => updateField('chartImageUrl', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Division Eyebrow</label>
              <Input value={formData.divisionEyebrow} onChange={(event) => updateField('divisionEyebrow', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Vijayawada Tab Label</label>
              <Input value={formData.vijayawadaDivisionLabel} onChange={(event) => updateField('vijayawadaDivisionLabel', event.target.value)} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Guntakal Tab Label</label>
              <Input value={formData.guntakalDivisionLabel} onChange={(event) => updateField('guntakalDivisionLabel', event.target.value)} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-28 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D97706]">WEBSITE CONTENT</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#0F172A] heading-font">{activePage.label} Page Editor</h1>
            <p className="mt-3 max-w-2xl text-base text-[#475569]">{activePage.description}. Changes are saved to the backend and reflected on the public page.</p>
          </div>
          <div className="flex gap-3">
            <Link to={activePage.publicPath} target="_blank" rel="noreferrer">
              <Button variant="outline">Open Public Page</Button>
            </Link>
            <Button onClick={handleSave} disabled={loading || saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {STATIC_PAGE_OPTIONS.map((page) => (
            <Link key={page.key} to={page.adminPath}>
              <Button variant={page.key === activePage.key ? 'default' : 'outline'}>{page.label}</Button>
            </Link>
          ))}
        </div>

        <Card className="border border-[#E2E8F0] bg-white p-6">
          {loading ? (
            <div className="py-12 text-center text-sm font-medium text-[#475569]">Loading page content...</div>
          ) : renderPageFields()}
        </Card>
      </div>
    </div>
  );
};

export default AdminStaticContentPage;