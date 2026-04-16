// Rename the original array to avoid redeclaration
const _stationsRaw = [
  {
    division: "Vijayawada",
    subdivisions: [
      {
        name: "Vijayawada Sub Division (NTR)",
        circles: [
          {
            name: "IRP Vijayawada",
            incharge: "IRP",
            phone: "9247585710",
            stations: [
              { name: "Vijayawada RPS", incharge: "SIRP", phone: "9247585712", district: "NTR", address: "Vijayawada Railway Station, NTR District, AP", lat: 16.5062, lng: 80.6480 }
            ]
          },
          {
            name: "Vijayawada Circle",
            incharge: "IRP",
            phone: "9247585711",
            stations: [
              { name: "Gudivada RPS", incharge: "SIRP", phone: "9247585713", district: "Krishna", address: "Gudivada Railway Station, Krishna District, AP", lat: 16.4350, lng: 80.9950 },
              { name: "Machilipatnam RPOP", incharge: "SIRP", phone: "9247585714", district: "Krishna", address: "Machilipatnam Railway Station, Krishna District, AP", lat: 16.1875, lng: 81.1389 },
              { name: "Eluru RPS", incharge: "SIRP", phone: "9247585769", district: "Eluru", address: "Eluru Railway Station, Eluru District, AP", lat: 16.7107, lng: 81.1056 }
            ]
          }
        ]
      },
      {
        name: "Guntur Sub Division",
        circles: [
          {
            name: "IRP Guntur",
            incharge: "IRP",
            phone: "9247585715",
            stations: [
              { name: "Guntur RPS", incharge: "SIRP", phone: "9247585716", district: "Guntur", address: "Guntur Railway Station, Guntur District, AP", lat: 16.3067, lng: 80.4365 }
            ]
          },
          {
            name: "Guntur Circle",
            incharge: "IRP",
            phone: "9247585717",
            stations: [
              { name: "Narasaraopet RPS", incharge: "SIRP", phone: "9247585720", district: "Guntur", address: "Narasaraopet Railway Station, Guntur District, AP", lat: 16.2349, lng: 80.0493 },
              { name: "Tenali RPS", incharge: "SIRP", phone: "9247585721", district: "Guntur", address: "Tenali Railway Station, Guntur District, AP", lat: 16.2420, lng: 80.6400 },
              { name: "Bapatla RPOP", incharge: "SIRP", phone: "9247585722", district: "Bapatla", address: "Bapatla Railway Station, Bapatla District, AP", lat: 15.9042, lng: 80.4674 },
              { name: "Nadikudi RPS", incharge: "SIRP", phone: "9247585723", district: "Guntur", address: "Nadikudi Railway Station, Guntur District, AP", lat: 16.3964, lng: 79.8867 },
              { name: "Repalle RPOP", incharge: "HC", phone: "9247585724", district: "Bapatla", address: "Repalle Railway Station, Bapatla District, AP", lat: 16.0184, lng: 80.8405 }
            ]
          }
        ]
      },
      {
        name: "Rajahmundry Sub Division",
        circles: [
          {
            name: "IRP Rajahmundry",
            incharge: "IRP",
            phone: "9247585726",
    stations: [
              { name: "Rajahmundry RPS", incharge: "SIRP", phone: "9247585726", district: "East Godavari", address: "Rajahmundry Railway Station, East Godavari District, AP", lat: 17.0052, lng: 81.7897 },
              { name: "Godavari RPOP", incharge: "HC", phone: "9247585734", district: "East Godavari", address: "Godavari Railway Station, East Godavari District, AP", lat: 17.0225, lng: 81.7838 },
            ]
          },        
          {
            name: "Kakinada Circle",
            incharge: "IRP",
            phone: "9247585727",
            stations: [
              { name: "Samalkot RPS", incharge: "SI", phone: "9247585729", district: "Kakinada", address: "Samalkot Railway Station, Kakinada District, AP", lat: 17.0560, lng: 82.1767 },
              { name: "Kakinada RPOP", incharge: "", phone: "9247585730", district: "Kakinada", address: "Kakinada Railway Station, Kakinada District, AP", lat: 16.9891, lng: 82.2475 },
              { name: "Tuni RPS", incharge: "SI", phone: "9247585731", district: "Kakinada", address: "Tuni Railway Station, Kakinada District, AP", lat: 17.3593, lng: 82.5466 },
              { name: "Annavaram RPOP", incharge: "HC", phone: "9247585734", district: "Kakinada", address: "Annavaram Railway Station, Kakinada District, AP", lat: 17.2849, lng: 82.3935 },
            ]
          },
          {
            name: "Bhimavaram Circle",
            incharge: "IRP",
            phone: "9247585728",
            stations: [
              { name: "Bhimavaram RPS", incharge: "SI", phone: "9247585732", district: "West Godavari", address: "Bhimavaram Railway Station, West Godavari District, AP", lat: 16.5408, lng: 81.5230 },
              { name: "Narsapur RPOP", incharge: "HC", phone: "9247585732", district: "West Godavari", address: "Narsapur Railway Station, West Godavari District, AP", lat: 16.4344, lng: 81.7017 },
              { name: "Tadepalligudem RPS", incharge: "SI", phone: "9247585733", district: "West Godavari", address: "Tadepalligudem Railway Station, West Godavari District, AP", lat: 16.8138, lng: 81.5278 },
              { name: "Nidavole RPOP", incharge: "HC", phone: "9247585735", district: "West Godavari", address: "Nidavole Railway Station, West Godavari District, AP", lat: 16.9050, lng: 81.6728 },
              { name: "Tanuku RPOP", incharge: "HC", phone: "9247585733", district: "West Godavari", address: "Tanuku Railway Station, West Godavari District, AP", lat: 16.7544, lng: 81.6826 },
            ]
          }
        ]
      },
      {
        name: "Visakhapatnam Sub Division",
        circles: [
          {
            name: "IRP Visakhapatnam",
            incharge: "IRP",
            phone: "9247585737",
            stations: [
              { name: "Visakhapatnam RPS", district: "Visakhapatnam", rank: "SI", phone: "9247585739 / 9247585740", address: "Visakhapatnam Railway Station, Visakhapatnam District, AP", lat: 17.6868, lng: 83.2185 },
              { name: "Duvvada RPOP", district: "Visakhapatnam", rank: "", phone: "9247585741", address: "Duvvada Railway Station, Visakhapatnam District, AP", lat: 17.6930, lng: 83.1520 },
            ]
          },
          {
            name: "Visakhapatnam Circle",
            incharge: "IRP",
            phone: "9247585738",
            stations: [
              { name: "Vizianagaram RPS", district: "Vizianagaram", rank: "SI", phone: "9247585742", address: "Vizianagaram Railway Station, Vizianagaram District, AP", lat: 18.1067, lng: 83.3956 },
              { name: "Parvathipuram RPOP", district: "Parvathipuram", rank: "HC", phone: "9247585746", address: "Parvathipuram Railway Station, Parvathipuram District, AP", lat: 18.7786, lng: 83.4264 },
              { name: "Bobbili RPOP", district: "Vizianagaram", rank: "HC", phone: "9247585745", address: "Bobbili Railway Station, Vizianagaram District, AP", lat: 18.5735, lng: 83.3597 },
              { name: "Palasa RPS", district: "Srikakulam", rank: "SI", phone: "9247585743", address: "Palasa Railway Station, Srikakulam District, AP", lat: 18.7726, lng: 84.4107 },
              { name: "Srikakulam RPOP", district: "Srikakulam", rank: "", phone: "9247585744", address: "Srikakulam Railway Station, Srikakulam District, AP", lat: 18.2949, lng: 83.8938 },
            ]
          }
        ]
      }
    ]
  },
  {
    division: "Guntakal",
    subdivisions: [
      {
        name: "Guntakal Sub Division",
        circles: [
          {
            name: "Guntakal circle",
            incharge: "IRP",
            phone: "9247575604",
            stations: [
              { name: "Guntakal RPS", district: "Anantapur", rank: "SI", phone: "9247575605", address: "Guntakal Railway Station, Anantapur District, AP", lat: 15.1696, lng: 77.3730 },
              { name: "Gooty RPS", district: "Anantapur", rank: "SI", phone: "9247575606", address: "Gooty Railway Station, Anantapur District, AP", lat: 15.1036, lng: 77.6343 },
              { name: "Tadipatri RPOP", district: "Anantapur", rank: "I/c", phone: "9247575647", address: "Tadipatri Railway Station, Anantapur District, AP", lat: 14.9120, lng: 78.0100 },
              { name: "Adoni RPS", district: "Kurnool", rank: "SI", phone: "9247575607", address: "Adoni Railway Station, Kurnool District, AP", lat: 15.6279, lng: 77.2749 },
              { name: "Rayadurgam RPOP", district: "Anantapur", rank: "", phone: "9247575614", address: "Rayadurgam Railway Station, Anantapur District, AP", lat: 14.6992, lng: 76.8520 },
              { name: "Mantralayam RPOP", district: "Kurnool", rank: "HC", phone: "9247575640", address: "Mantralayam Road Railway Station, Kurnool District, AP", lat: 15.9443, lng: 77.4256 },
            ]
          },
          {
            name: "Kurnool circle",
            incharge: "IRP",
            phone: "9247575608",
            stations: [
              { name: "Kurnool RPS", district: "Kurnool", rank: "SI", phone: "9247575609", address: "Kurnool Railway Station, Kurnool District, AP", lat: 15.8281, lng: 78.0373 },
              { name: "Dhone RPOP", district: "Kurnool", rank: "SI", phone: "9247575610", address: "Dhone Railway Station, Kurnool District, AP", lat: 15.3959, lng: 77.8716 },
              { name: "Nandyal RPS", district: "Nandyal", rank: "SI", phone: "9247575611", address: "Nandyal Railway Station, Nandyal District, AP", lat: 15.4779, lng: 78.4836 },
              { name: "Markapuram RPOP", district: "Prakasam", rank: "HC", phone: "9247575643", address: "Markapuram Railway Station, Prakasam District, AP", lat: 15.7357, lng: 79.2706 },
            ]
          },
          {
            name: "Dharmavaram circle",
            incharge: "IRP",
            phone: "9247575612",
            stations: [
              { name: "Dharmavaram RPS", district: "Anantapur", rank: "SI", phone: "9247575614", address: "Dharmavaram Railway Station, Anantapur District, AP", lat: 14.4143, lng: 77.7200 },
              { name: "Anantapuramu RPS", district: "Anantapur", rank: "SI", phone: "9247575613", address: "Anantapuramu Railway Station, Anantapur District, AP", lat: 14.6819, lng: 77.6006 },
              { name: "Hindupuramu RPS", district: "Anantapur", rank: "SI", phone: "9247575615", address: "Hindupuramu Railway Station, Anantapur District, AP", lat: 13.8281, lng: 77.4914 },
              { name: "SSSPN RS RPOP", district: "Anantapur", rank: "HC", phone: "9247575644", address: "SSSPN RS Railway Station, Anantapur District, AP", lat: 14.1666, lng: 77.8110 },
              { name: "Kadiri RPS", district: "Anantapur", rank: "SI", phone: "9247575616", address: "Kadiri Railway Station, Anantapur District, AP", lat: 14.1117, lng: 78.1590 },
              { name: "Puttaparthi RPOP", district: "Anantapur", rank: "HC", phone: "9247575644", address: "Puttaparthi Railway Station, Anantapur District, AP", lat: 14.1650, lng: 77.8100 },
            ]
          },
          {
            name: "Tirupati circle",
            incharge: "IRP",
            phone: "9247575618",
            stations: [
              { name: "Tirupati RPS", district: "Tirupati", rank: "SI", phone: "9247575619", address: "Tirupati Railway Station, Tirupati District, AP", lat: 13.6288, lng: 79.4192 },
            ]
          },
          {
            name: "Renigunta circle",
            incharge: "IRP",
            phone: "9247575620",
            stations: [
              { name: "Renigunta RPS", district: "Tirupati", rank: "SI", phone: "9247575621", address: "Renigunta Railway Station, Tirupati District, AP", lat: 13.6514, lng: 79.5126 },
              { name: "Chittoor RPS", district: "Chittoor", rank: "SI", phone: "9247575622", address: "Chittoor Railway Station, Chittoor District, AP", lat: 13.2172, lng: 79.1003 },
              { name: "Puttur RPOP", district: "Tirupati", rank: "", phone: "9247585724", address: "Puttur Railway Station, Tirupati District, AP", lat: 13.4450, lng: 79.5510 },
              { name: "Srikalahasti RPOP", district: "Tirupati", rank: "I/c", phone: "9247575649", address: "Srikalahasti Railway Station, Tirupati District, AP", lat: 13.7515, lng: 79.7036 },
              { name: "Pakala RPOP", district: "Tirupati", rank: "I/c", phone: "9247575650", address: "Pakala Railway Station, Tirupati District, AP", lat: 13.4485, lng: 79.1140 },
              { name: "Kuppam RPOP", district: "Chittoor", rank: "", phone: "9247575642", address: "Kuppam Railway Station, Chittoor District, AP", lat: 12.7499, lng: 78.3415 },
            ]
          },
          {
            name: "Kadapa circle",
            incharge: "IRP",
            phone: "9247575623",
            stations: [
              { name: "Kadapa RPS", district: "Kadapa", rank: "SI", phone: "9247575624", address: "Kadapa Railway Station, Kadapa District, AP", lat: 14.4673, lng: 78.8242 },
              { name: "Yerraguntla RPS", district: "Kadapa", rank: "SI", phone: "9247575625", address: "Yerraguntla Railway Station, Kadapa District, AP", lat: 14.6380, lng: 78.5390 },
              { name: "Nandalur RPOP", district: "Kadapa", rank: "", phone: "9247585724", address: "Nandalur Railway Station, Kadapa District, AP", lat: 14.2835, lng: 79.1170 },
            ]
          }
        ]
      },
      {
        name: "Nellore Sub Division",
        circles: [
          {
            name: "Nellore circle",
            incharge: "IRP",
            phone: "9247575627",
            stations: [
              { name: "Nellore RPS", district: "Nellore", rank: "SI", phone: "9247575628", address: "Nellore Railway Station, Nellore District, AP", lat: 14.4426, lng: 79.9865 },
              { name: "Gudur RPS", district: "Nellore", rank: "SI", phone: "9247575629", address: "Gudur Railway Station, Nellore District, AP", lat: 14.1463, lng: 79.8504 },
              { name: "Sullurupeta RPOP", district: "Nellore", rank: "I/c", phone: "9247575648", address: "Sullurupeta Railway Station, Nellore District, AP", lat: 13.7006, lng: 80.0183 },
              { name: "Kavali RPS", district: "Nellore", rank: "SI", phone: "9247575630", address: "Kavali Railway Station, Nellore District, AP", lat: 14.9130, lng: 79.9945 },
              { name: "Krishnapatnam Port RPOP", district: "Nellore", rank: "HC", phone: "9247575628", address: "Krishnapatnam Port, Nellore District, AP", lat: 14.2550, lng: 80.1230 },
              { name: "Bitragunta RPOP", district: "Nellore", rank: "HC", phone: "9247575628", address: "Bitragunta Railway Station, Nellore District, AP", lat: 14.8025, lng: 79.9880 },
            ]
          },
          {
            name: "Ongole circle",
            incharge: "IRP",
            phone: "9247575631",
            stations: [
              { name: "Ongole RPS", district: "Prakasam", rank: "SI", phone: "9247575632", address: "Ongole Railway Station, Prakasam District, AP", lat: 15.5057, lng: 80.0499 },
              { name: "Chirala RPS", district: "Bapatla", rank: "SI", phone: "9247575633", address: "Chirala Railway Station, Bapatla District, AP", lat: 15.8230, lng: 80.3520 },
              { name: "Singarayakonda RPOP", district: "Prakasam", rank: "", phone: "9247575632", address: "Singarayakonda Railway Station, Prakasam District, AP", lat: 15.2490, lng: 80.0270 },
            ]
          }
        ]
      }
    ]
  }
];

// Map legacy incharge values to new roles
function mapInchargeRole(role) {
  if (!role) return "station";
  const r = role.trim().toLowerCase();
  if (r === "irp") return "irp";
  if (["sirp", "hc", "si", "i/c"].includes(r)) return "station";
  return "station";
}

export const stations = _stationsRaw.map(division => ({
  ...division,
  subdivisions: division.subdivisions.map(sub => ({
    ...sub,
    circles: sub.circles.map(circle => ({
      ...circle,
      incharge: mapInchargeRole(circle.incharge),
      stations: circle.stations.map(station => ({
        ...station,
        incharge: mapInchargeRole(station.incharge || station.rank)
      }))
    }))
  }))
}));

// Flat list of all individual police stations for StationsPage
export const stationsList = _stationsRaw.flatMap(division =>
  division.subdivisions.flatMap(sub =>
    sub.circles.flatMap(circle =>
      circle.stations.map((station, idx) => ({
        id: `${division.division}-${sub.name}-${circle.name}-${idx}`,
        name: station.name ?? '',
        district: station.district ?? '',
        address: station.address ?? '',
        phone: station.phone ?? '',
        lat: station.lat ?? station.latitude ?? null,
        lng: station.lng ?? station.longitude ?? null,
        division: division.division,
        subdivision: sub.name,
        circle: circle.name,
      }))
    )
  )
);