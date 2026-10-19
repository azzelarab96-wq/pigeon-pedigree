import { PigeonData } from './types';

export const createEmptyPigeons = (count: number = 31): PigeonData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    ring: '',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '',
    sex: i === 0 ? 'M' : (i % 2 === 1 ? 'M' : 'V'),
    results: '',
    bgColor: '#ffffff',
  }));
};

// Exact data from the PDF provided by the user
export const getPdfDemoPigeons = (): PigeonData[] => {
  const p = createEmptyPigeons(31);

  // 0 : Subject
  p[0] = {
    id: 0,
    ring: 'MA 593-21',
    name: 'Boraq',
    strain: 'Kras',
    owner: 'Abdessamad El Bahdaoui',
    color: 'Kras',
    year: '2021',
    sex: 'M',
    results: `1°Ace Speed 4/4 Club '22'
2°Ace Speed 4/4 Union '22'
3°Ace Speed 5/5 Club '23'
7°Ace Speed 5/5 Union '23'
1. 274km 1490p Club
1. 274km 5160p Union
3. 243km 1706p Club
6. 204km 1625p Club
11. 204km 6883p Union
16. 245km 5869p Union`,
    bgColor: '#ffffff',
  };

  // 1 : Father
  p[1] = {
    id: 1,
    ring: 'MA 2559-20',
    name: 'The 59',
    strain: '',
    owner: 'Chakour & Alaoui',
    color: '',
    year: '2020',
    sex: 'M',
    results: `Father of :
1°Ace Speed 4/4 Club '22'
2°Ace Speed 4/4 Union '22'
3°Ace Speed 5/5 Club '23'
7°Ace Speed 5/5 Union '23'
1. 274km 1490p Club
1. 274km 5160p Union
3. 243km 1706p Club
6. 204km 1625p Club
11. 204km 6883p Union
16. 245km 5869p Union`,
    bgColor: '#ffffff',
  };

  // 2 : Mother
  p[2] = {
    id: 2,
    ring: 'MA 28527-16',
    name: '527',
    strain: 'Kras Pb',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2016',
    sex: 'V',
    results: `Mother of :
1°Ace Speed 4/4 Club '22'
2°Ace Speed 4/4 Union '22'
3°Ace Speed 5/5 Club '23'
7°Ace Speed 5/5 Union '23'
1. 274km 1490p Club
1. 274km 5160p Union
3. 243km 1706p Club
6. 204km 1625p Club
11. 204km 6883p Union
16. 245km 5869p Union`,
    bgColor: '#ffffff',
  };

  // 3 : Paternal Grandfather
  p[3] = {
    id: 3,
    ring: 'MA 69065-19',
    name: 'The 65',
    strain: '',
    owner: 'Ahmed Chakour',
    color: '',
    year: '2019',
    sex: 'M',
    results: `1°Ace Pigeon Speed 2020
====================
Brother to:
1°Ace Middle Distance '20'
1°Ace Speed / Mid-Dist '20'
2°Ace Pointe Mid-Dist '20'
3°Ace Pigeon Speed '20'
1. 505km 10200p '20'
1. 505km 1214p '20'
5. 150km 2467p '20'
6. 200km 2279p '20'
7. 276km 1828p '20'
8. 150km 2467p '20'`,
    bgColor: '#ffffff',
  };

  // 4 : Paternal Grandmother
  p[4] = {
    id: 4,
    ring: 'MA 185705-19',
    name: 'Miss 05',
    strain: '',
    owner: 'Chakour-Carboni',
    color: '',
    year: '2019',
    sex: 'V',
    results: `5. 150km 2467p 2020
====================
Half-Sister to:
1°Ace Speed Pigeon '20'
1°Ace Middle Distance '20'
1°Ace Speed / Mid-Dist '20'
2°Ace Pointe Mid-Dist '20'
3°Ace Pigeon Speed '20'
1. 505km 10200p '20'
1. 505km 1214p '20'
5. 150km 2467p '20'
6. 200km 2279p '20'
7. 276km 1828p '20'`,
    bgColor: '#ffffff',
  };

  // 5 : Maternal Grandfather
  p[5] = {
    id: 5,
    ring: 'POR 0360-13',
    name: 'PT 2013',
    strain: 'Keas',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2013',
    sex: 'M',
    results: `Grand Father to: "Boraq"
1°Ace Speed 4/4 Club '22'
2°Ace Speed 4/4 Union '22'
3°Ace Speed 5/5 Club '23'
7°Ace Speed 5/5 Union '23'
1. 274km 1490p Club
1. 274km 5160p Union
3. 243km 1706p Club
6. 204km 1625p Club
11. 204km 6883p Union
16. 245km 5869p Union`,
    bgColor: '#ffffff',
  };

  // 6 : Maternal Grandmother
  p[6] = {
    id: 6,
    ring: 'POR 0364-13',
    name: 'Miss 2013',
    strain: 'Krad',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2013',
    sex: 'V',
    results: `Grand Mother to: "Boraq"
1°Ace Speed 4/4 Club '22'
2°Ace Speed 4/4 Union '22'
3°Ace Speed 5/5 Club '23'
7°Ace Speed 5/5 Union '23'
1. 274km 1490p Club
1. 274km 5160p Union
3. 243km 1706p Club
6. 204km 1625p Club
11. 204km 6883p Union
16. 245km 5869p Union`,
    bgColor: '#ffffff',
  };

  // 7 : Great-Grandfather 1
  p[7] = {
    id: 7,
    ring: 'MA 22601-18',
    name: '601',
    strain: '',
    owner: 'Frère Taou',
    color: '',
    year: '2018',
    sex: 'M',
    results: `Father of :
1°Ace Speed Pigeon '20'
1°Ace Middle Distance '20'
1°Ace Speed / Mid-Dist '20'
2°Ace Pointe Mid-Dist '20'`,
    bgColor: '#ffffff',
  };

  // 8 : Great-Grandmother 1 (Green in PDF)
  p[8] = {
    id: 8,
    ring: 'MA 060672-14',
    name: '672',
    strain: '',
    owner: 'Chakour Ahmed',
    color: '',
    year: '2014',
    sex: 'V',
    results: `Mother of :
1°Ace Speed Pigeon '20'
1°Ace Middle Distance '20'
1°Ace Speed / Mid-Dist '20'
2°Ace Pointe Mid-Dist '20'`,
    bgColor: '#6ee7b7', // Vibrant green from PDF
  };

  // 9 : Great-Grandfather 2
  p[9] = {
    id: 9,
    ring: 'IT 003167-16',
    name: 'Eros',
    strain: 'Blue\nBest Bloodlin\nGaby Vandenbeele',
    owner: 'Eros Carboni',
    color: 'Blue',
    year: '2016',
    sex: 'M',
    results: ``,
    bgColor: '#ffffff',
  };

  // 10 : Great-Grandmother 2 (Green in PDF)
  p[10] = {
    id: 10,
    ring: 'MA 060672-14',
    name: '672',
    strain: '',
    owner: 'Chakour Ahmed',
    color: '',
    year: '2014',
    sex: 'V',
    results: `Mother of :
1°Ace Speed Pigeon '20'
1°Ace Middle Distance '20'
1°Ace Speed / Mid-Dist '20'
2°Ace Pointe Mid-Dist '20'`,
    bgColor: '#6ee7b7', // Vibrant green from PDF
  };

  // 11 : Great-Grandfather 3
  p[11] = {
    id: 11,
    ring: 'POR 2008-08',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '2008',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 12 : Great-Grandmother 3
  p[12] = {
    id: 12,
    ring: 'POR 2002-02',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '2002',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 13 : Great-Grandfather 4
  p[13] = {
    id: 13,
    ring: 'POR 2003-03',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '2003',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 14 : Great-Grandmother 4
  p[14] = {
    id: 14,
    ring: 'ESP 2007-07',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '2007',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 15 : Great-Great-Grandfather 1
  p[15] = {
    id: 15,
    ring: 'BE 6075235-13',
    name: '235',
    strain: '',
    owner: 'Leo Heremans',
    color: '',
    year: '2013',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 16 : Great-Great-Grandmother 1
  p[16] = {
    id: 16,
    ring: 'BE 6241251-14',
    name: '251',
    strain: '',
    owner: 'Dirk Van Dyck',
    color: '',
    year: '2014',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 17 : Great-Great-Grandfather 2
  p[17] = {
    id: 17,
    ring: 'BE 6091234-12',
    name: 'Olympiade 003',
    strain: 'Heremans-Ceusters',
    owner: 'Leo Heremans',
    color: '',
    year: '2012',
    sex: 'M',
    results: 'Top Breeder',
    bgColor: '#ffffff',
  };

  // 18 : Great-Great-Grandmother 2
  p[18] = {
    id: 18,
    ring: 'BE 6091235-12',
    name: 'Sister Di Caprio',
    strain: 'Dirk Van Dyck',
    owner: 'Dirk Van Dyck',
    color: '',
    year: '2012',
    sex: 'V',
    results: 'Mother of Aces',
    bgColor: '#ffffff',
  };

  // 19 : Great-Great-Grandfather 3
  p[19] = {
    id: 19,
    ring: 'BE 3170501-11',
    name: '501',
    strain: '',
    owner: 'Gaby Vandenbeele',
    color: '',
    year: '2011',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 20 : Great-Great-Grandmother 3
  p[20] = {
    id: 20,
    ring: 'IT 156187-13',
    name: 'Adry',
    strain: '',
    owner: 'Eros Carboni',
    color: '',
    year: '2013',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 21 : Great-Great-Grandfather 4
  p[21] = {
    id: 21,
    ring: 'BE 3008003-10',
    name: 'Rudy Junior',
    strain: 'Vandenabeele',
    owner: 'Gaby Vandenabeele',
    color: '',
    year: '2010',
    sex: 'M',
    results: 'Super Line',
    bgColor: '#ffffff',
  };

  // 22 : Great-Great-Grandmother 4
  p[22] = {
    id: 22,
    ring: 'BE 3008004-10',
    name: 'Kiti',
    strain: 'Vandenabeele',
    owner: 'Gaby Vandenabeele',
    color: '',
    year: '2010',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 23 : Great-Great-Grandfather 5
  p[23] = {
    id: 23,
    ring: 'POR 1001-05',
    name: 'Porto Ace 1',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 24 : Great-Great-Grandmother 5
  p[24] = {
    id: 24,
    ring: 'POR 1002-05',
    name: 'Porto Lady 2',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 25 : Great-Great-Grandfather 6
  p[25] = {
    id: 25,
    ring: 'POR 1003-05',
    name: 'Porto Ace 3',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 26 : Great-Great-Grandmother 6
  p[26] = {
    id: 26,
    ring: 'POR 1004-05',
    name: 'Porto Lady 4',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 27 : Great-Great-Grandfather 7
  p[27] = {
    id: 27,
    ring: 'POR 1005-05',
    name: 'Porto Ace 5',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 28 : Great-Great-Grandmother 7
  p[28] = {
    id: 28,
    ring: 'POR 1006-05',
    name: 'Porto Lady 6',
    strain: 'Mohsin Line',
    owner: 'Mohsin El Omari',
    color: '',
    year: '2005',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  // 29 : Great-Great-Grandfather 8
  p[29] = {
    id: 29,
    ring: 'ESP 1007-04',
    name: 'Iberico 7',
    strain: 'Spanish Fond',
    owner: 'Derby Costa',
    color: '',
    year: '2004',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 30 : Great-Great-Grandmother 8
  p[30] = {
    id: 30,
    ring: 'ESP 1008-04',
    name: 'Iberica 8',
    strain: 'Spanish Fond',
    owner: 'Derby Costa',
    color: '',
    year: '2004',
    sex: 'V',
    results: '',
    bgColor: '#ffffff',
  };

  return p;
};

// Compuclub demo data from original user script
export const getCompuclubDemoPigeons = (): PigeonData[] => {
  const p = createEmptyPigeons(31);
  p[0] = {
    id: 0,
    ring: 'BE 11-6099308',
    name: 'Speedy ACE',
    strain: 'Blauw',
    owner: '',
    color: 'Blauw',
    year: '2011',
    sex: 'M',
    results: `*7ème National ACE*
**KBDB MD 2012**
1er Melun 642p
2ème Dourdan 618p
3ème Melun 665p
3ème Dourdan 373p
5ème Dourdan 529p
8ème Dourdan 774p
15ème Dourdan 754p`,
    bgColor: '#ffffff',
  };
  p[1] = {
    id: 1,
    ring: 'BE 09-6332904',
    name: '',
    strain: 'Lanslots-Dockx',
    owner: '',
    color: 'Blauw',
    year: '2009',
    sex: 'M',
    results: `Blauwe\nBlauw\nPère 7ème Nat. ACE`,
    bgColor: '#ffffff',
  };
  p[2] = {
    id: 2,
    ring: '09-6247106',
    name: '',
    strain: 'Johny Vreys',
    owner: '',
    color: 'Blauw',
    year: '2009',
    sex: 'V',
    results: `Blauw\nMère 7ème Nat. ACE`,
    bgColor: '#ffffff',
  };
  p[3] = { id: 3, ring: '03-6394864', name: '', strain: '', owner: '', color: '', year: '', sex: 'M', results: '', bgColor: '#ffffff' };
  p[4] = { id: 4, ring: '02-6333413', name: '', strain: '', owner: '', color: '', year: '', sex: 'V', results: '', bgColor: '#ffffff' };
  p[5] = { id: 5, ring: '07-6399652', name: '', strain: '', owner: '', color: '', year: '', sex: 'M', results: '', bgColor: '#ffffff' };
  p[6] = { id: 6, ring: '07-6343678', name: '', strain: '', owner: '', color: '', year: '', sex: 'V', results: '', bgColor: '#ffffff' };
  return p;
};

// Default high resolution circular SVG logo matching the PDF emblem (Base64 encoded for 100% mobile compatibility)
export const DEFAULT_PDF_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+CiAgPGRlZnM+CiAgICA8cGF0aCBpZD0idGV4dENpcmNsZSIgZD0iTSAyMCwgMTAwIGEgODAsODAgMCAxLDEgMTYwLDAgYSA4MCw4MCAwIDEsMSAtMTYwLDAiIC8+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJsdWVHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iJTIzMWU0MGFmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iJTIzMDI4NGM3Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJyZWRHcmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iJTIzZGMyNjI2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iJTIzYjkxYzFjIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9Ijk2IiBmaWxsPSIlMjNmZmZmZmYiIHN0cm9rZT0iJTIzMDI4NGM3IiBzdHJva2Utd2lkdGg9IjQiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9Ijg4IiBmaWxsPSJub25lIiBzdHJva2U9IiUyMzAyODRjNyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjMsMyIvPgogIDx0ZXh0IGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiUyMzAzNjlhMSIgbGV0dGVyLXNwYWNpbmc9IjIiPgogICAgPHRleHRQYXRoIGhyZWY9IiUyM3RleHRDaXJjbGUiIHN0YXJ0T2Zmc2V0PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPgogICAgICBBQkRFU1NBTUFEIEVMIEJBSERBT1VJCiAgICA8L3RleHRQYXRoPgogIDwvdGV4dD4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjY2IiBmaWxsPSIlMjNmOGZhZmMiIHN0cm9rZT0iJTIzZGMyNjI2IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAsIDEwOCkiPgogICAgPHRleHQgeD0iLTI0IiB5PSIxMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjUyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ1cmwoJTIzYmx1ZUdyYWQpIiBsZXR0ZXItc3BhY2luZz0iLTMiPkE8L3RleHQ+CiAgICA8dGV4dCB4PSI2IiB5PSIxMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjUyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ1cmwoJTIzcmVkR3JhZCkiIGxldHRlci1zcGFjaW5nPSItMyI+QjwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==`;
