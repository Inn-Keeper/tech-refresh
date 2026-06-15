import React from "react";
import { colors } from "@tech-refresh/core/tokens";

export type Retro = {
  id: string;
  round: string;
  questions: string;
  wentWell: string;
  toImprove: string;
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
};

export const EMPTY_RETRO: Omit<Retro, "id" | "date"> = {
  round: "",
  questions: "",
  wentWell: "",
  toImprove: "",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  background: colors.bgDeep,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 56,
  resize: "vertical",
  lineHeight: 1.5,
};
