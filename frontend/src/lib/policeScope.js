import { stations } from '@/data/stations';

const IRP_CIRCLE_STATIONS = {
  'IRP Vijayawada': ['Vijayawada RPS'],
  'Vijayawada Circle': ['Gudivada RPS', 'Machilipatnam RPOP', 'Eluru RPS'],
  'IRP Guntur': ['Guntur RPS'],
  'Guntur Circle': ['Narasaraopet RPS', 'Tenali RPS', 'Bapatla RPOP', 'Nadikudi RPS', 'Repalle RPOP'],
  'IRP Rajahmundry': ['Rajahmundry RPS', 'Godavari RPOP'],
  'Kakinada Circle': ['Samalkot RPS', 'Kakinada RPOP', 'Tuni RPS', 'Annavaram RPOP'],
  'Bhimavaram Circle': ['Bhimavaram RPS', 'Narsapur RPOP', 'Tadepalligudem RPS', 'Nidavole RPOP', 'Tanuku RPOP'],
  'IRP Visakhapatnam': ['Visakhapatnam RPS', 'Duvvada RPOP'],
  'Vizianagaram Circle': ['Vizianagaram RPS', 'Parvathipuram RPOP', 'Bobbili RPOP', 'Palasa RPS', 'Srikakulam RPOP'],
  'Guntakal Circle': ['Guntakal RPS', 'Gooty RPS', 'Tadipatri RPOP', 'Adoni RPS', 'Rayadurgam RPOP', 'Mantralayam RPOP'],
  'Kurnool Circle': ['Kurnool RPS', 'Dhone RPOP', 'Nandyal RPS', 'Markapuram RPOP'],
  'Dharmavaram Circle': ['Dharmavaram RPS', 'Anantapuramu RPS', 'Hindupuramu RPS', 'SSSPN RS RPOP', 'Kadiri RPS', 'Puttaparthi RPOP'],
  'Tirupati Circle': ['Tirupati RPS'],
  'Renigunta Circle': ['Renigunta RPS', 'Chittoor RPS', 'Puttur RPOP', 'Srikalahasti RPOP', 'Pakala RPOP', 'Kuppam RPOP'],
  'Kadapa Circle': ['Kadapa RPS', 'Yerraguntla RPS', 'Nandalur RPOP'],
  'Nellore Circle': ['Nellore RPS', 'Gudur RPS', 'Sullurupeta RPOP', 'Kavali RPS', 'Krishnapatnam Port RPOP', 'Bitragunta RPOP'],
  'Ongole Circle': ['Ongole RPS', 'Chirala RPS', 'Singarayakonda RPOP'],
};

const DSRP_SUBDIVISION_STATIONS = {
  'Vijayawada Sub Division': ['Vijayawada RPS', 'Gudivada RPS', 'Machilipatnam RPOP', 'Eluru RPS'],
  'Guntur Sub Division': ['Guntur RPS', 'Narasaraopet RPS', 'Tenali RPS', 'Bapatla RPOP', 'Nadikudi RPS', 'Repalle RPOP'],
  'Rajahmundry Sub Division': ['Rajahmundry RPS', 'Samalkot RPS', 'Kakinada RPOP', 'Tuni RPS', 'Godavari RPOP', 'Annavaram RPOP', 'Bhimavaram RPS', 'Tadepalligudem RPS', 'Nidavole RPOP', 'Narsapur RPOP', 'Tanuku RPOP'],
  'Visakhapatnam Sub Division': ['Visakhapatnam RPS', 'Duvvada RPOP', 'Vizianagaram RPS', 'Parvathipuram RPOP', 'Bobbili RPOP', 'Palasa RPS', 'Srikakulam RPOP'],
  'Guntakal Sub Division': ['Guntakal RPS', 'Gooty RPS', 'Adoni RPS', 'Kurnool RPS', 'Dhone RPOP', 'Nandyal RPS', 'Mantralayam RPOP', 'Anantapuramu RPS', 'Dharmavaram RPS', 'Hindupuramu RPS', 'Kadiri RPS', 'Rayadurgam RPOP', 'Tadipatri RPOP', 'Markapuram RPOP', 'Puttaparthi RPOP', 'SSSPN RS RPOP'],
  'Tirupati Sub Division': ['Tirupati RPS', 'Renigunta RPS', 'Chittoor RPS', 'Kadapa RPS', 'Yerraguntla RPS', 'Puttur RPOP', 'Srikalahasti RPOP', 'Pakala RPOP', 'Kuppam RPOP', 'Nandalur RPOP'],
  'Nellore Sub Division': ['Nellore RPS', 'Gudur RPS', 'Kavali RPS', 'Ongole RPS', 'Chirala RPS', 'Krishnapatnam Port RPOP', 'Sullurupeta RPOP', 'Bitragunta RPOP', 'Singarayakonda RPOP'],
};

const IRP_PHONE_TO_CIRCLE = {
  '9247585710': 'IRP Vijayawada',
  '9247585711': 'Vijayawada Circle',
  '9247585716': 'IRP Guntur',
  '9247585717': 'Guntur Circle',
  '9247585726': 'IRP Rajahmundry',
  '9247585727': 'Kakinada Circle',
  '9247585728': 'Bhimavaram Circle',
  '9247585737': 'IRP Visakhapatnam',
  '9247585738': 'Vizianagaram Circle',
  '9247575604': 'Guntakal Circle',
  '9247575608': 'Kurnool Circle',
  '9247575612': 'Dharmavaram Circle',
  '9247575618': 'Tirupati Circle',
  '9247575620': 'Renigunta Circle',
  '9247575623': 'Kadapa Circle',
  '9247575627': 'Nellore Circle',
  '9247575631': 'Ongole Circle',
};

const DSRP_PHONE_TO_SUBDIVISION = {
  '9247585709': 'Vijayawada Sub Division',
  '9247585715': 'Guntur Sub Division',
  '9247585725': 'Rajahmundry Sub Division',
  '9247585736': 'Visakhapatnam Sub Division',
  '9247575603': 'Guntakal Sub Division',
  '9247575617': 'Tirupati Sub Division',
  '9247575626': 'Nellore Sub Division',
};

const SRP_DIVISION_STATIONS = {
  'Vijayawada Division': [
    'Vijayawada RPS', 'Gudivada RPS', 'Machilipatnam RPOP', 'Eluru RPS',
    'Guntur RPS', 'Narasaraopet RPS', 'Tenali RPS', 'Bapatla RPOP', 'Nadikudi RPS', 'Repalle RPOP',
    'Rajahmundry RPS', 'Samalkot RPS', 'Kakinada RPOP', 'Tuni RPS', 'Godavari RPOP', 'Annavaram RPOP', 'Bhimavaram RPS', 'Tadepalligudem RPS', 'Nidavole RPOP', 'Narsapur RPOP', 'Tanuku RPOP',
    'Visakhapatnam RPS', 'Duvvada RPOP', 'Vizianagaram RPS', 'Parvathipuram RPOP', 'Bobbili RPOP', 'Palasa RPS', 'Srikakulam RPOP',
  ],
  'Guntakal Division': [
    'Guntakal RPS', 'Gooty RPS', 'Adoni RPS', 'Kurnool RPS', 'Dhone RPOP', 'Nandyal RPS', 'Mantralayam RPOP', 'Anantapuramu RPS', 'Dharmavaram RPS', 'Hindupuramu RPS', 'Kadiri RPS', 'Rayadurgam RPOP', 'Tadipatri RPOP', 'Markapuram RPOP', 'Puttaparthi RPOP', 'SSSPN RS RPOP',
    'Tirupati RPS', 'Renigunta RPS', 'Chittoor RPS', 'Kadapa RPS', 'Yerraguntla RPS', 'Puttur RPOP', 'Srikalahasti RPOP', 'Pakala RPOP', 'Kuppam RPOP', 'Nandalur RPOP',
    'Nellore RPS', 'Gudur RPS', 'Kavali RPS', 'Ongole RPS', 'Chirala RPS', 'Krishnapatnam Port RPOP', 'Sullurupeta RPOP', 'Bitragunta RPOP', 'Singarayakonda RPOP',
  ],
};

const SRP_PHONE_TO_DIVISION = {
  '9247585800': 'Vijayawada Division',
  '9247575601': 'Guntakal Division',
};

const CIRCLE_TO_SUBDIVISION = {
  'IRP Vijayawada': 'Vijayawada Sub Division',
  'Vijayawada Circle': 'Vijayawada Sub Division',
  'IRP Guntur': 'Guntur Sub Division',
  'Guntur Circle': 'Guntur Sub Division',
  'IRP Rajahmundry': 'Rajahmundry Sub Division',
  'Kakinada Circle': 'Rajahmundry Sub Division',
  'Bhimavaram Circle': 'Rajahmundry Sub Division',
  'IRP Visakhapatnam': 'Visakhapatnam Sub Division',
  'Vizianagaram Circle': 'Visakhapatnam Sub Division',
  'Guntakal Circle': 'Guntakal Sub Division',
  'Kurnool Circle': 'Guntakal Sub Division',
  'Dharmavaram Circle': 'Guntakal Sub Division',
  'Tirupati Circle': 'Tirupati Sub Division',
  'Renigunta Circle': 'Tirupati Sub Division',
  'Kadapa Circle': 'Tirupati Sub Division',
  'Nellore Circle': 'Nellore Sub Division',
  'Ongole Circle': 'Nellore Sub Division',
};

const SUBDIVISION_TO_DIVISION = {
  'Vijayawada Sub Division': 'Vijayawada Division',
  'Guntur Sub Division': 'Vijayawada Division',
  'Rajahmundry Sub Division': 'Vijayawada Division',
  'Visakhapatnam Sub Division': 'Vijayawada Division',
  'Guntakal Sub Division': 'Guntakal Division',
  'Tirupati Sub Division': 'Guntakal Division',
  'Nellore Sub Division': 'Guntakal Division',
};

const uniqueStationNames = Array.from(new Set(stations.map((s) => s.name)));

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const dedupe = (arr) => Array.from(new Set(arr));

const extractPhoneDigits = (value) => String(value || '').replace(/\D+/g, '');

const stationsForCircle = (circleName) => IRP_CIRCLE_STATIONS[circleName] || [];
const stationsForSubdivision = (subdivisionName) => DSRP_SUBDIVISION_STATIONS[subdivisionName] || [];
const stationsForDivision = (divisionName) => SRP_DIVISION_STATIONS[divisionName] || [];

const stationCircleMap = (() => {
  const out = {};
  Object.entries(IRP_CIRCLE_STATIONS).forEach(([circle, stationList]) => {
    stationList.forEach((stationName) => {
      if (!out[stationName]) out[stationName] = circle;
    });
  });
  return out;
})();

export const getStationHierarchy = (stationName) => {
  const circle = stationCircleMap[stationName] || '';
  const subdivision = CIRCLE_TO_SUBDIVISION[circle] || '';
  const division = SUBDIVISION_TO_DIVISION[subdivision] || '';
  return { station: stationName, circle, subdivision, division };
};

export const getAllStations = () => uniqueStationNames;

export const getOfficerScope = (user) => {
  if (!user) {
    return { scope: 'public', dashboardPath: '/dashboard', stations: uniqueStationNames, defaultStation: '' };
  }

  // Route IRP users directly to IRP dashboard
  if (user.role === 'irp') {
    return {
      scope: 'irp',
      dashboardPath: '/irp-dashboard',
      stations: uniqueStationNames,
      defaultStation: '',
    };
  }
  if (user.role === 'dsrp') {
    return {
      scope: 'dsrp',
      dashboardPath: '/dsrp-dashboard',
      stations: uniqueStationNames,
      defaultStation: '',
    };
  }
  if (user.role === 'srp') {
    return {
      scope: 'srp',
      dashboardPath: '/srp-dashboard',
      stations: uniqueStationNames,
      defaultStation: '',
    };
  }
  if (user.role === 'station') {
    const stationName = user.name;
    return {
      scope: 'station',
      dashboardPath: '/station-dashboard',
      stations: uniqueStationNames.includes(stationName) ? [stationName] : uniqueStationNames,
      defaultStation: stationName,
    };
  }
  if (user.role === 'dgp' || user.role === 'adgp' || user.role === 'dig') {
    return {
      scope: 'dgp',
      dashboardPath: '/dgp-dashboard',
      stations: uniqueStationNames,
      defaultStation: '',
    };
  }
  if (user.role !== 'police') {
    return { scope: 'public', dashboardPath: '/dashboard', stations: uniqueStationNames, defaultStation: '' };
  }

  const normalizedName = normalize(user.name);
  const phoneDigits = extractPhoneDigits(user.phone);

  if (
    normalizedName.includes('adgp') ||
    normalizedName.includes('dgp') ||
    normalizedName.includes('dig') ||
    normalizedName.includes('directorgeneral') ||
    normalizedName.includes('deputyinspectorgeneral')
  ) {
    return {
      scope: 'dgp',
      dashboardPath: '/dgp-dashboard',
      stations: uniqueStationNames,
      defaultStation: '',
    };
  }

  let srpStations = [];
  const mappedDivision = SRP_PHONE_TO_DIVISION[phoneDigits];
  if (mappedDivision) {
    srpStations = stationsForDivision(mappedDivision);
  } else {
    const matchedDivision = Object.keys(SRP_DIVISION_STATIONS).find((name) => normalizedName.includes(normalize(name)));
    if (matchedDivision) srpStations = stationsForDivision(matchedDivision);
  }

  if (srpStations.length > 0) {
    const filtered = dedupe(srpStations).filter((name) => uniqueStationNames.includes(name));
    return {
      scope: 'srp',
      dashboardPath: '/srp-dashboard',
      stations: filtered,
      defaultStation: filtered[0] || '',
    };
  }

  let dsrpStations = [];
  const mappedSubdivision = DSRP_PHONE_TO_SUBDIVISION[phoneDigits];
  if (mappedSubdivision) {
    dsrpStations = stationsForSubdivision(mappedSubdivision);
  } else {
    const matchedSubdivision = Object.keys(DSRP_SUBDIVISION_STATIONS).find((name) => normalizedName.includes(normalize(name)));
    if (matchedSubdivision) dsrpStations = stationsForSubdivision(matchedSubdivision);
  }

  if (dsrpStations.length > 0) {
    const filtered = dedupe(dsrpStations).filter((name) => uniqueStationNames.includes(name));
    return {
      scope: 'dsrp',
      dashboardPath: '/dsrp-dashboard',
      stations: filtered,
      defaultStation: filtered[0] || '',
    };
  }

  let irpStations = [];
  const mappedCircle = IRP_PHONE_TO_CIRCLE[phoneDigits];
  if (mappedCircle) {
    irpStations = stationsForCircle(mappedCircle);
  } else {
    const matchedCircle = Object.keys(IRP_CIRCLE_STATIONS).find((name) => normalizedName.includes(normalize(name)));
    if (matchedCircle) irpStations = stationsForCircle(matchedCircle);
  }

  if (irpStations.length > 0) {
    const filtered = dedupe(irpStations).filter((name) => uniqueStationNames.includes(name));
    return {
      scope: 'irp',
      dashboardPath: '/irp-dashboard',
      stations: filtered,
      defaultStation: filtered[0] || '',
    };
  }

  const stationName = user.name;
  if (uniqueStationNames.includes(stationName)) {
    return {
      scope: 'station',
      dashboardPath: '/station-dashboard',
      stations: [stationName],
      defaultStation: stationName,
    };
  }

  return { scope: 'station', dashboardPath: '/station-dashboard', stations: uniqueStationNames, defaultStation: '' };
};
