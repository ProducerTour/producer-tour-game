import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container, Section, SectionHeader } from './ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from './animations';
import { faqData, faqCategories } from './data';

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

function AccordionItem({ question, answer, isOpen, onClick }: AccordionItemProps) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-start justify-between gap-4 text-left group"
      >
        <span className={`text-lg font-medium transition-colors ${
          isOpen ? 'text-white' : 'text-text-secondary group-hover:text-white'
        }`}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className={`w-5 h-5 transition-colors ${
            isOpen ? 'text-brand-blue' : 'text-text-muted'
          }`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-text-secondary leading-relaxed pr-12">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = activeCategory === 'all'
    ? faqData
    : faqData.filter(faq => faq.category === activeCategory);

  const handleAccordionClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Section id="faq" padding="xl" className="relative">
      <Container>
        <ScrollReveal>
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about how Producer Tour works."
          />
        </ScrollReveal>

        {/* Category Filter */}
        <ScrollReveal className="mb-12">
          <div className="flex flex-wrap justify-center gap-2">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setOpenIndex(0);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-white text-surface'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* FAQ Grid - Two Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-0">
          {/* Left Column */}
          <StaggerContainer>
            {filteredFaqs.slice(0, Math.ceil(filteredFaqs.length / 2)).map((faq, index) => (
              <StaggerItem key={`${faq.category}-${index}`}>
                <AccordionItem
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === index}
                  onClick={() => handleAccordionClick(index)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Right Column */}
          <StaggerContainer delay={0.2}>
            {filteredFaqs.slice(Math.ceil(filteredFaqs.length / 2)).map((faq, index) => {
              const actualIndex = index + Math.ceil(filteredFaqs.length / 2);
              return (
                <StaggerItem key={`${faq.category}-${actualIndex}`}>
                  <AccordionItem
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openIndex === actualIndex}
                    onClick={() => handleAccordionClick(actualIndex)}
                  />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        {/* Contact CTA */}
        <ScrollReveal className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-text-secondary">
              Still have questions?
            </p>
            <a
              href="mailto:support@producertour.com"
              className="text-brand-blue hover:text-white transition-colors font-medium"
            >
              Contact our team →
            </a>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
