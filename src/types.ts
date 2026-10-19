export type PigeonSex = 'M' | 'V';

export interface PigeonData {
  id: number;
  ring: string;
  name: string;
  strain: string;
  owner: string;
  color: string;
  year: string;
  sex: PigeonSex;
  results: string;
  bgColor: string;
}

export type PedigreeTheme = 'elghali' | 'compuclub' | 'compuclub4' | 'classic';
export type PedigreeTextSize = 'normal' | 'grand' | 'tres_grand';

export interface PedigreeProject {
  id: string;
  ring: string;
  name?: string;
  pigeons: PigeonData[];
  ownerName: string;
  ownerDetails: string;
  logo: string;
  theme: PedigreeTheme;
  textSize?: PedigreeTextSize;
  showOwnerFooter: boolean;
  updatedAt: string;
}
