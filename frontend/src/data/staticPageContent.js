export const STATIC_PAGE_OPTIONS = [
  {
    key: 'home',
    label: 'Home',
    description: 'Hero section and DGP message',
    publicPath: '/',
    adminPath: '/admin/content/home',
  },
];

export const DEFAULT_STATIC_PAGE_CONTENT = {
  home: {
    heroTitle: 'Government Railway Police',
    heroSubtitle: 'Andhra Pradesh',
    heroTagline: 'Your safety is our priority. Protecting passengers and ensuring law and order across railway premises 24/7.',
    dgpQuote: 'Our commitment is to ensure the safety and security of every railway passenger. Together, we strive for a safer Andhra Pradesh.',
    dgpSignature: 'Sri K. Harishkumar Gupta, I.P.S., Director General of Police, Andhra Pradesh',
  },
  about: {
    eyebrow: 'ABOUT US',
    title: 'Government Railway Police',
    subtitle: 'Andhra Pradesh',
    imageUrl: '/Vijayawada.png',
    whatIsGrpTitle: 'What is GRP?',
    whatIsGrpParagraphs: [
      'The Government Railway Police (GRP) is a specialized police force responsible for maintaining law and order, preventing crime, and ensuring the safety and security of passengers within railway premises across Andhra Pradesh.',
      'GRP operates under the jurisdiction of the state government and works in coordination with Railway Protection Force (RPF) to provide comprehensive security coverage across railway stations, trains, and railway property.',
      'Our dedicated officers work round-the-clock to protect passengers, investigate crimes, and provide assistance to travelers in distress.',
    ],
    dutiesTitle: 'Duties & Responsibilities',
    dutyCards: [
      {
        title: 'Law Enforcement',
        description: 'Investigating crimes, registering FIRs, and taking appropriate legal action against offenders within railway premises.',
      },
      {
        title: 'Passenger Safety',
        description: 'Ensuring the safety and security of passengers, especially women, children, and senior citizens during their railway journey.',
      },
      {
        title: 'Crime Prevention',
        description: 'Patrolling railway stations and trains, conducting surveillance, and taking preventive measures to deter criminal activities.',
      },
      {
        title: 'Public Assistance',
        description: 'Providing help to passengers in distress, managing lost and found property, and assisting in emergency situations.',
      },
    ],
    comparisonTitle: 'GRP vs RPF',
    grpTitle: 'GRP (Government Railway Police)',
    grpPoints: [
      'State government organization',
      'Investigates crimes and registers FIRs',
      'Handles criminal cases under IPC and CrPC',
      'Jurisdiction over railway premises within the state',
      'Primary law enforcement authority',
    ],
    rpfTitle: 'RPF (Railway Protection Force)',
    rpfPoints: [
      'Central government organization',
      'Focuses on railway property protection',
      'Handles railway-specific offenses',
      'Pan-India jurisdiction',
      'Works in coordination with GRP',
    ],
  },
  history: {
    heroEyebrow: 'OUR JOURNEY',
    heroTitle: 'History of GRP',
    heroSubtitle: 'From British Era to Digital Policing',
    sectionEyebrow: 'HISTORY',
    sections: [
      {
        title: 'Origin of GRP (British Period)',
        paragraphs: [
          'The concept of railway policing in India dates back to the British colonial era when the first railway line was established in 1853 between Mumbai and Thane. Recognizing the need for specialized security on railways, the British administration established the Railway Police to maintain law and order in railway premises.',
          'Initially, railway police were part of the general police force but were gradually organized into a separate entity to handle the unique challenges of railway security.',
        ],
        bullets: [],
      },
      {
        title: 'Evolution after Independence',
        paragraphs: [
          'After India gained independence in 1947, the railway police system underwent significant reorganization. The Government Railway Police (GRP) was formally established as a state subject under the Indian Constitution, with each state having jurisdiction over railway policing within its territory.',
          'The division of responsibilities between GRP (state police) and RPF (central police) was clearly defined, with GRP handling criminal investigations and RPF focusing on railway property protection.',
        ],
        bullets: [],
      },
      {
        title: 'GRP in Andhra Pradesh',
        paragraphs: [
          'The Government Railway Police of Andhra Pradesh was established to ensure passenger safety and maintain law and order across the extensive railway network in the state. With major railway junctions like Visakhapatnam, Vijayawada, and Tirupati, AP GRP plays a crucial role in railway security.',
          'Today, AP GRP operates multiple police stations strategically located at major railway stations across the state, providing 24/7 security and assistance to millions of passengers.',
        ],
        bullets: [],
      },
      {
        title: 'Legal Framework',
        paragraphs: ['GRP operates under various legal provisions including:'],
        bullets: [
          'Railway Act, 1989: Governs railway operations and security',
          'Indian Penal Code (IPC): For criminal investigations',
          'Code of Criminal Procedure (CrPC): For procedural matters',
          'State Police Act: For administrative framework',
        ],
      },
      {
        title: 'Major Achievements',
        paragraphs: [],
        bullets: [
          'Successfully resolved thousands of theft and missing person cases',
          'Implemented women safety initiatives and dedicated helplines',
          'Established effective lost and found property management system',
          'Conducted numerous awareness programs for passenger safety',
          'Modernized investigation techniques with digital tools',
        ],
      },
      {
        title: 'Modern Developments',
        paragraphs: ['AP GRP has embraced technology and modern policing methods:'],
        bullets: [
          'CCTV Surveillance: Comprehensive camera coverage at major stations',
          'Digital Complaint System: Online FIR registration and tracking',
          'Mobile Apps: Easy access to GRP services via smartphones',
          'AI Chatbot: Bilingual assistance in English and Telugu',
          'Data Analytics: Crime pattern analysis for prevention',
          'Rapid Response Teams: Quick deployment for emergencies',
        ],
      },
    ],
  },
  organization: {
    title: 'Organization Structure',
    subtitle: 'Complete GRP Andhra Pradesh Hierarchy & Contact Directory',
    chartTitle: 'Organization Chart',
    chartImageUrl: 'https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/g21ig43u_image.png',
    divisionEyebrow: 'SELECT DIVISION',
    vijayawadaDivisionLabel: 'Vijayawada Railway Division',
    guntakalDivisionLabel: 'Guntakal Railway Division',
  },
};