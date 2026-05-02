
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';

const L = ({ to, children }) => (
  <Link to={to} className="text-[#2563EB] underline font-medium hover:text-[#1D4ED8]">
    {children}
  </Link>
);

const FAQ_LIST = [
  {
    en: {
      question: 'What is GRP (Government Railway Police)?',
      answer: <>GRP is the Government Railway Police of Andhra Pradesh, responsible for maintaining law and order at railway stations and trains. Learn more on the <L to="/about">About page</L> and <L to="/history">History page</L>.</>
    },
    te: {
      question: 'GRP (గవర్నమెంట్ రైల్వే పోలీస్) అంటే ఏమిటి?',
      answer: <>GRP అంటే ఆంధ్రప్రదేశ్ గవర్నమెంట్ రైల్వే పోలీస్, రైల్వే స్టేషన్లు మరియు రైళ్లలో శాంతిభద్రతలు నిర్వహించే బాధ్యత వహిస్తుంది. మరింత తెలుసుకోవడానికి <L to="/about">అబౌట్ పేజీ</L> మరియు <L to="/history">హిస్టరీ పేజీ</L> చూడండి.</>
    },
    hi: {
      question: 'GRP (सरकारी रेलवे पुलिस) क्या है?',
      answer: <>GRP आंध्र प्रदेश की सरकारी रेलवे पुलिस है, जो रेलवे स्टेशनों और ट्रेनों में कानून व्यवस्था बनाए रखने के लिए जिम्मेदार है। अधिक जानकारी के लिए <L to="/about">अबाउट पेज</L> और <L to="/history">हिस्ट्री पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'What is the GRP helpline number?',
      answer: <>The GRP 24x7 helpline is <strong>139</strong>. Call for emergencies, lost property, or any assistance at railway stations.</>
    },
    te: {
      question: 'GRP హెల్ప్‌లైన్ నంబర్ ఏమిటి?',
      answer: <>GRP 24x7 హెల్ప్‌లైన్ నంబర్ <strong>139</strong>. అత్యవసర సమయాల్లో, పోగొట్టుకున్న వస్తువులకు లేదా రైల్వే స్టేషన్లలో ఏ సహాయానికైనా కాల్ చేయండి.</>
    },
    hi: {
      question: 'GRP हेल्पलाइन नंबर क्या है?',
      answer: <>GRP की 24x7 हेल्पलाइन <strong>139</strong> है। आपातकाल, खोई हुई संपत्ति या रेलवे स्टेशनों पर किसी भी सहायता के लिए कॉल करें।</>
    }
  },
  {
    en: {
      question: 'What services does GRP offer?',
      answer: <>GRP offers e-complaint filing, station locator, women safety helpline, mobile tracking, and more. Visit the <L to="/services">Services page</L> for the full list.</>
    },
    te: {
      question: 'GRP ఏయే సేవలు అందిస్తుంది?',
      answer: <>GRP ఈ-ఫిర్యాదు దాఖలు, స్టేషన్ లొకేటర్, మహిళా భద్రత హెల్ప్‌లైన్, మొబైల్ ట్రాకింగ్ మరియు మరిన్ని సేవలు అందిస్తుంది. పూర్తి జాబితా కోసం <L to="/services">సర్వీసెస్ పేజీ</L> చూడండి.</>
    },
    hi: {
      question: 'GRP कौन-कौन सी सेवाएं प्रदान करता है?',
      answer: <>GRP ई-शिकायत दर्ज करना, स्टेशन लोकेटर, महिला सुरक्षा हेल्पलाइन, मोबाइल ट्रैकिंग और अन्य सेवाएं प्रदान करता है। पूरी सूची के लिए <L to="/services">सर्विसेज पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'How do I file a complaint?',
      answer: <>Go to the <L to="/complaint">File e-Complaint page</L>, fill in your personal details and incident information, and submit the form. You will receive an Complaint Number by email.</>
    },
    te: {
      question: 'ఫిర్యాదు ఎలా దాఖలు చేయాలి?',
      answer: <><L to="/complaint">ఈ-కంప్లైంట్ పేజీ</L>కి వెళ్ళి, మీ వ్యక్తిగత వివరాలు మరియు సంఘటన సమాచారం నమోదు చేసి సమర్పించండి. మీ ఇమెయిల్‌కు అక్నాలెడ్జ్‌మెంట్ నంబర్ వస్తుంది.</>
    },
    hi: {
      question: 'शिकायत कैसे दर्ज करें?',
      answer: <><L to="/complaint">ई-कंप्लेंट पेज</L> पर जाएं, अपना व्यक्तिगत विवरण और घटना की जानकारी भरें और फॉर्म सबमिट करें। आपको ईमेल पर एक एक्नॉलेजमेंट नंबर प्राप्त होगा।</>
    }
  },
  {
    en: {
      question: 'How do I know my complaint status?',
      answer: <>You will receive an email alert on the email address you submitted with your complaint whenever there is an update on your complaint status.</>
    },
    te: {
      question: 'నా ఫిర్యాదు స్థితి ఎలా తెలుసుకోవాలి?',
      answer: <>మీ ఫిర్యాదులో సమర్పించిన ఇమెయిల్ చిరునామాకు అప్‌డేట్ వచ్చినప్పుడు ఇమెయిల్ అలర్ట్ వస్తుంది.</>
    },
    hi: {
      question: 'मेरी शिकायत की स्थिति कैसे जानें?',
      answer: <>जब भी आपकी शिकायत में कोई अपडेट होगा, आपको शिकायत में दिए गए ईमेल पते पर ईमेल अलर्ट प्राप्त होगा।</>
    }
  },
  {
    en: {
      question: 'Are there any charges for filing a complaint?',
      answer: <>No, filing a complaint with GRP is completely free of charge. Visit the <L to="/complaint">Complaint page</L> to get started.</>
    },
    te: {
      question: 'ఫిర్యాదు దాఖలు చేయడానికి ఏమైనా రుసుము ఉందా?',
      answer: <>లేదు, GRP వద్ద ఫిర్యాదు దాఖలు చేయడం పూర్తిగా ఉచితం. <L to="/complaint">కంప్లైంట్ పేజీ</L> సందర్శించండి.</>
    },
    hi: {
      question: 'शिकायत दर्ज करने के लिए कोई शुल्क है?',
      answer: <>नहीं, GRP में शिकायत दर्ज करना पूरी तरह निःशुल्क है। <L to="/complaint">कंप्लेंट पेज</L> पर जाएं।</>
    }
  },
  {
    en: {
      question: 'What should I do if I lose something at the railway station?',
      answer: <>File a Lost & Found complaint on the <L to="/complaint">e-Complaint page</L> and select the appropriate category. Provide as much detail as possible about the lost item. GRP will assist in locating your property.</>
    },
    te: {
      question: 'రైల్వే స్టేషన్లో ఏదైనా పోగొట్టుకుంటే ఏం చేయాలి?',
      answer: <><L to="/complaint">ఈ-కంప్లైంట్ పేజీ</L>లో లాస్ట్ & ఫౌండ్ ఫిర్యాదు దాఖలు చేసి తగిన వర్గాన్ని ఎంచుకోండి. పోగొట్టుకున్న వస్తువు వివరాలు వీలైనంత ఇవ్వండి. GRP మీకు సహాయపడుతుంది.</>
    },
    hi: {
      question: 'रेलवे स्टेशन पर कुछ खो जाने पर क्या करें?',
      answer: <><L to="/complaint">ई-कंप्लेंट पेज</L> पर लॉस्ट & फाउंड शिकायत दर्ज करें और उचित श्रेणी चुनें। खोई हुई वस्तु का जितना हो सके विवरण दें। GRP आपकी सहायता करेगी।</>
    }
  },
  {
    en: {
      question: 'How do I report a missing person?',
      answer: <>Visit the <L to="/complaint">File e-Complaint page</L> and select &quot;Missing Person&quot; as the complaint type. Provide all available details including photos if possible.</>
    },
    te: {
      question: 'తప్పిపోయిన వ్యక్తిని ఎలా నివేదించాలి?',
      answer: <><L to="/complaint">ఈ-కంప్లైంట్ పేజీ</L>ని సందర్శించి "మిస్సింగ్ పర్సన్" అని ఎంచుకోండి. అన్ని వివరాలు, వీలైతే ఫోటోలు కూడా అందించండి.</>
    },
    hi: {
      question: 'लापता व्यक्ति की रिपोर्ट कैसे करें?',
      answer: <><L to="/complaint">ई-कंप्लेंट पेज</L> पर जाएं और "मिसिंग पर्सन" श्रेणी चुनें। सभी उपलब्ध विवरण, यदि संभव हो तो फोटो भी दें।</>
    }
  },
  {
    en: {
      question: 'How do I find the nearest GRP station?',
      answer: <>Visit the <L to="/stations">Stations page</L> to find contact details, phone numbers, and locations for all GRP stations across Andhra Pradesh.</>
    },
    te: {
      question: 'సమీప GRP స్టేషన్ ఎలా కనుగొనాలి?',
      answer: <>ఆంధ్రప్రదేశ్ అంతటా ఉన్న అన్ని GRP స్టేషన్ల సంప్రదింపు వివరాలు, ఫోన్ నంబర్లు మరియు లొకేషన్‌ల కోసం <L to="/stations">స్టేషన్స్ పేజీ</L> సందర్శించండి.</>
    },
    hi: {
      question: 'निकटतम GRP स्टेशन कैसे खोजें?',
      answer: <>आंध्र प्रदेश के सभी GRP स्टेशनों के संपर्क विवरण, फोन नंबर और स्थान के लिए <L to="/stations">स्टेशंस पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'What is Shakti / Women Safety?',
      answer: <>Shakti is a GRP initiative dedicated to women&apos;s safety at railway stations. Visit the <L to="/women-safety">Women Safety page</L> for SOS contacts and safety information. For urgent help call <strong>139</strong>.</>
    },
    te: {
      question: 'శక్తి / మహిళా భద్రత అంటే ఏమిటి?',
      answer: <>శక్తి అంటే రైల్వే స్టేషన్లలో మహిళా భద్రతకు అంకితమైన GRP కార్యక్రమం. SOS సంప్రదింపులు మరియు భద్రతా సమాచారం కోసం <L to="/women-safety">మహిళా భద్రత పేజీ</L> సందర్శించండి. అత్యవసర సహాయానికి <strong>139</strong> కు కాల్ చేయండి.</>
    },
    hi: {
      question: 'शक्ति / महिला सुरक्षा क्या है?',
      answer: <>शक्ति रेलवे स्टेशनों पर महिला सुरक्षा के लिए GRP की पहल है। SOS संपर्क और सुरक्षा जानकारी के लिए <L to="/women-safety">महिला सुरक्षा पेज</L> देखें। तत्काल सहायता के लिए <strong>139</strong> पर कॉल करें।</>
    }
  },
  {
    en: {
      question: 'How do I contact the Help Desk?',
      answer: <>Go to the <L to="/help-desk">Help Desk page</L> and submit your request with your details. For urgent assistance, call <strong>139</strong>.</>
    },
    te: {
      question: 'హెల్ప్ డెస్క్‌ను ఎలా సంప్రదించాలి?',
      answer: <><L to="/help-desk">హెల్ప్ డెస్క్ పేజీ</L>కి వెళ్ళి మీ వివరాలతో అభ్యర్థన సమర్పించండి. అత్యవసర సహాయానికి <strong>139</strong> కు కాల్ చేయండి.</>
    },
    hi: {
      question: 'हेल्प डेस्क से कैसे संपर्क करें?',
      answer: <><L to="/help-desk">हेल्प डेस्क पेज</L> पर जाएं और अपने विवरण के साथ अनुरोध सबमिट करें। तत्काल सहायता के लिए <strong>139</strong> पर कॉल करें।</>
    }
  },
  {
    en: {
      question: 'How do I give feedback about GRP services?',
      answer: <>You can submit feedback or raise a query through the <L to="/help-desk">Help Desk page</L>. Our team will get back to you at the earliest.</>
    },
    te: {
      question: 'GRP సేవలపై అభిప్రాయం ఎలా తెలియజేయాలి?',
      answer: <><L to="/help-desk">హెల్ప్ డెస్క్ పేజీ</L> ద్వారా అభిప్రాయం లేదా ప్రశ్న సమర్పించవచ్చు. మా బృందం వీలైనంత త్వరగా స్పందిస్తుంది.</>
    },
    hi: {
      question: 'GRP सेवाओं पर फीडबैक कैसे दें?',
      answer: <><L to="/help-desk">हेल्प डेस्क पेज</L> के माध्यम से फीडबैक या प्रश्न सबमिट कर सकते हैं। हमारी टीम जल्द से जल्द जवाब देगी।</>
    }
  },
  {
    en: {
      question: 'My mobile was stolen at the station — what can I do?',
      answer: <>First, file a complaint on the <L to="/complaint">e-Complaint page</L>. You can also block your stolen device using your IMEI number via the <L to="/mobile-tracking">Mobile Tracking page</L>, which provides access to the CEIR portal and step-by-step guidance.</>
    },
    te: {
      question: 'స్టేషన్‌లో నా మొబైల్ దొంగిలించబడింది — ఏం చేయాలి?',
      answer: <>ముందుగా <L to="/complaint">ఈ-కంప్లైంట్ పేజీ</L>లో ఫిర్యాదు దాఖలు చేయండి. మీ IMEI నంబర్ ద్వారా దొంగిలించబడిన పరికరాన్ని బ్లాక్ చేయడానికి <L to="/mobile-tracking">మొబైల్ ట్రాకింగ్ పేజీ</L> సందర్శించండి, అక్కడ CEIR పోర్టల్ లింక్ మరియు దశల వారీ గైడ్ ఉంటాయి.</>
    },
    hi: {
      question: 'स्टेशन पर मेरा मोबाइल चोरी हो गया — क्या करूं?',
      answer: <>सबसे पहले <L to="/complaint">ई-कंप्लेंट पेज</L> पर शिकायत दर्ज करें। अपने IMEI नंबर से चोरी हुए डिवाइस को ब्लॉक करने के लिए <L to="/mobile-tracking">मोबाइल ट्रैकिंग पेज</L> देखें, जहां CEIR पोर्टल लिंक और चरण-दर-चरण गाइड उपलब्ध है।</>
    }
  },
  {
    en: {
      question: 'What is CEIR and how does IMEI blocking work?',
      answer: <>CEIR (Central Equipment Identity Register) is a Government of India portal to block and track stolen mobile phones. Visit our <L to="/mobile-tracking">Mobile Tracking page</L> for full instructions and a direct link to the CEIR portal.</>
    },
    te: {
      question: 'CEIR అంటే ఏమిటి మరియు IMEI బ్లాకింగ్ ఎలా పని చేస్తుంది?',
      answer: <>CEIR (సెంట్రల్ ఎక్విప్‌మెంట్ ఐడెంటిటీ రిజిస్టర్) అనేది దొంగిలించబడిన మొబైల్ ఫోన్‌లను బ్లాక్ చేయడానికి మరియు ట్రాక్ చేయడానికి భారత ప్రభుత్వ పోర్టల్. పూర్తి సూచనలు మరియు CEIR పోర్టల్ లింక్ కోసం <L to="/mobile-tracking">మొబైల్ ట్రాకింగ్ పేజీ</L> సందర్శించండి.</>
    },
    hi: {
      question: 'CEIR क्या है और IMEI ब्लॉकिंग कैसे काम करती है?',
      answer: <>CEIR (सेंट्रल इक्विपमेंट आइडेंटिटी रजिस्टर) भारत सरकार का पोर्टल है जो चोरी हुए मोबाइल फोन को ब्लॉक और ट्रैक करता है। पूर्ण निर्देश और CEIR पोर्टल लिंक के लिए <L to="/mobile-tracking">मोबाइल ट्रैकिंग पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'What is an Unidentified Body report?',
      answer: <>GRP publishes details of unidentified persons found at railway stations. Visit the <L to="/unidentified-bodies">Unidentified Bodies page</L> to search records and help identify individuals.</>
    },
    te: {
      question: 'గుర్తు తెలియని మృతదేహ నివేదిక అంటే ఏమిటి?',
      answer: <>GRP రైల్వే స్టేషన్లలో దొరికిన గుర్తు తెలియని వ్యక్తుల వివరాలను ప్రచురిస్తుంది. రికార్డులు శోధించడానికి మరియు వ్యక్తులను గుర్తించడంలో సహాయం చేయడానికి <L to="/unidentified-bodies">అన్‌ఐడెంటిఫైడ్ బాడీస్ పేజీ</L> సందర్శించండి.</>
    },
    hi: {
      question: 'अज्ञात शव रिपोर्ट क्या होती है?',
      answer: <>GRP रेलवे स्टेशनों पर मिले अज्ञात व्यक्तियों का विवरण प्रकाशित करता है। रिकॉर्ड खोजने और व्यक्तियों की पहचान में मदद के लिए <L to="/unidentified-bodies">अनआइडेंटिफाइड बॉडीज पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'How can I learn about GRP\'s history and organization?',
      answer: <>Visit the <L to="/history">History page</L> to learn about GRP&apos;s background, and the <L to="/organization">Organization page</L> to see the command structure of Andhra Pradesh GRP.</>
    },
    te: {
      question: 'GRP చరిత్ర మరియు సంస్థ గురించి ఎక్కడ తెలుసుకోవచ్చు?',
      answer: <>GRP నేపథ్యం తెలుసుకోవడానికి <L to="/history">హిస్టరీ పేజీ</L> సందర్శించండి, మరియు ఆంధ్రప్రదేశ్ GRP కమాండ్ స్ట్రక్చర్ చూడడానికి <L to="/organization">ఆర్గనైజేషన్ పేజీ</L> చూడండి.</>
    },
    hi: {
      question: 'GRP का इतिहास और संगठन कहां जानें?',
      answer: <>GRP की पृष्ठभूमि जानने के लिए <L to="/history">हिस्ट्री पेज</L> और आंध्र प्रदेश GRP की कमान संरचना देखने के लिए <L to="/organization">ऑर्गनाइज़ेशन पेज</L> देखें।</>
    }
  },
  {
    en: {
      question: 'Is my personal information safe?',
      answer: <>Yes, your information is kept strictly confidential and used only for official complaint resolution purposes by GRP officers.</>
    },
    te: {
      question: 'నా వ్యక్తిగత సమాచారం సురక్షితంగా ఉంటుందా?',
      answer: <>అవును, మీ సమాచారం పూర్తిగా గోప్యంగా ఉంచబడుతుంది మరియు GRP అధికారులు అధికారిక ఫిర్యాదు పరిష్కారం కోసం మాత్రమే ఉపయోగిస్తారు.</>
    },
    hi: {
      question: 'क्या मेरी व्यक्तिगत जानकारी सुरक्षित है?',
      answer: <>हां, आपकी जानकारी पूरी तरह गोपनीय रखी जाती है और GRP अधिकारी केवल आधिकारिक शिकायत समाधान के लिए इसका उपयोग करते हैं।</>
    }
  },
];

const LANG_LABELS = { en: 'EN', te: 'తె', hi: 'हि' };

export const ChatBot = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openIdx, setOpenIdx] = React.useState(null);
  const [lang, setLang] = React.useState('en');

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
        className="fixed bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto w-full sm:w-96 h-[85vh] sm:h-[min(500px,calc(100vh-7rem))] bg-white sm:rounded-lg rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col z-[9999]"
      >
        <div className="bg-[#0F172A] text-white px-4 py-3 rounded-t-lg flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-bold text-sm truncate">GRP FAQ</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {Object.entries(LANG_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setLang(key); setOpenIdx(null); }}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                  lang === key
                    ? 'bg-white text-[#0F172A]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors ml-1"
              aria-label="Close FAQ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
          {FAQ_LIST.map((item, idx) => (
            <div key={idx}>
              <button
                className="w-full text-left font-medium text-[#2563EB] hover:underline focus:outline-none"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                {item[lang].question}
              </button>
              {openIdx === idx && (
                <div className="mt-2 mb-4 text-gray-700 text-sm bg-white border border-gray-200 rounded p-3 leading-relaxed" onClick={() => setIsOpen(false)}>
                  {item[lang].answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
