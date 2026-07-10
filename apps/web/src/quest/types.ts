export type Retro = {
  id: string;
  round: string;
  questions: string;
  wentWell: string;
  toImprove: string;
  struggledTechs: string[];
  date: string;
};

export type Contact = {
  id?: string;
  name: string;
  role: string;
  link: string;
  note: string;
  status: string;
  date: string;
  nextAction: string;
  nextActionDate: string;
  postingTechs: string[];
  retros?: Retro[];
};

export const EMPTY_FORM: Omit<Contact, "id" | "retros"> = {
  name: "",
  role: "",
  link: "",
  note: "",
  status: "Contacted",
  date: "",
  nextAction: "",
  nextActionDate: "",
  postingTechs: [],
};

export const EMPTY_RETRO: Omit<Retro, "id" | "date"> = {
  round: "",
  questions: "",
  wentWell: "",
  toImprove: "",
  struggledTechs: [],
};
