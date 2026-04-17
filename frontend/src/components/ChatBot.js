
import React from 'react';
import { MessageCircle, X } from 'lucide-react';

const FAQ_LIST = [
  {
    question: 'How do I file a complaint?',
    answer: 'Go to the “File Complaint” page, fill in your details and incident information, and submit the form. You will get a tracking number.'
  },
  {
    question: 'How can I track my complaint?',
    answer: 'Use your tracking number on the “Track Complaint” page to see the current status of your complaint.'
  },
  {
    question: 'What is the GRP helpline number?',
    answer: 'The GRP 24x7 helpline is 139. Call for emergencies or assistance at railway stations.'
  },
  {
    question: 'How do I find the nearest GRP station?',
    answer: 'Visit the “Stations” section on the website to find contact details and locations for all GRP stations.'
  },
  {
    question: 'What is Shakti / Women Safety?',
    answer: 'Shakti is a GRP initiative for women’s safety. For help, use the Help Desk or call 139.'
  },
  {
    question: 'How do I contact the Help Desk?',
    answer: 'Go to the “Help Desk” page and submit your request. For urgent help, call 139.'
  },
  // Expanded questions
  {
    question: 'Can I file a complaint anonymously?',
    answer: 'Yes, you can choose to file a complaint without providing your name. However, providing contact details helps us follow up if needed.'
  },
  {
    question: 'What documents are required to file a complaint?',
    answer: 'No documents are required for initial complaint filing. For certain cases, you may be asked for supporting documents during investigation.'
  },
  {
    question: 'How long does it take to resolve a complaint?',
    answer: 'Resolution time depends on the nature of the complaint. You can track progress online or contact the Help Desk for updates.'
  },
  {
    question: 'Is my personal information safe?',
    answer: 'Yes, your information is kept confidential and used only for complaint resolution purposes.'
  },
  {
    question: 'Can I withdraw my complaint?',
    answer: 'Yes, you can request to withdraw your complaint by contacting the Help Desk with your tracking number.'
  },
  {
    question: 'What should I do in case of lost property?',
    answer: 'File a complaint under the “Lost & Found” section and provide details of the lost item. GRP will assist in locating your property.'
  },
  {
    question: 'How do I report a missing person?',
    answer: 'Use the “File Complaint” page and select “Missing Person” as the complaint type. Provide all available details.'
  },
  {
    question: 'How do I give feedback about GRP services?',
    answer: 'You can submit feedback through the “Help Desk” page or contact us directly at the provided helpline.'
  },
  {
    question: 'What if I forget my complaint tracking number?',
    answer: 'Contact the Help Desk with your details. We will help you retrieve your tracking number.'
  },
  {
    question: 'Are there any charges for filing a complaint?',
    answer: 'No, filing a complaint with GRP is completely free of charge.'
  },
];

export const ChatBot = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openIdx, setOpenIdx] = React.useState(null);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#2563EB] text-white rounded-full shadow-lg hover:bg-[#1D4ED8] transition-colors flex items-center justify-center z-[9999]"
        aria-label="Open FAQ"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[9998] sm:hidden" />
      <div
        className="fixed bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto w-full sm:w-96 h-[85vh] sm:h-[min(500px,calc(100vh-5rem))] bg-white sm:rounded-lg rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-[9999]"
      >
        <div className="bg-[#0F172A] text-white p-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm">GRP FAQ</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            aria-label="Close FAQ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
          {FAQ_LIST.map((item, idx) => (
            <div key={idx}>
              <button
                className="w-full text-left font-medium text-[#2563EB] hover:underline focus:outline-none"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                {item.question}
              </button>
              {openIdx === idx && (
                <div className="mt-2 mb-4 text-gray-700 text-sm bg-white border border-gray-200 rounded p-3">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
